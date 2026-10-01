"""Bounded, read-only web tools. No browser-supplied URL is fetched."""
import asyncio
import ipaddress
import json
import re
import socket
from html.parser import HTMLParser
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit, urlunsplit

import httpx

from .settings import settings


class WebToolError(Exception):
    pass


class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []
        self.tables = []
        self.table_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'nav', 'footer', 'header', 'noscript', 'svg'):
            self.hidden += 1
        if not self.hidden:
            if tag == 'table':
                if not self.table_depth:
                    self.tables.append([])
                self.table_depth += 1
            if self.table_depth and tag in ('tr', 'td', 'th'):
                self.tables[-1].append('\n' if tag == 'tr' else ' | ')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'nav', 'footer', 'header', 'noscript', 'svg'):
            self.hidden = max(0, self.hidden - 1)
        if tag == 'table':
            self.table_depth = max(0, self.table_depth - 1)

    def handle_data(self, data):
        if not self.hidden and data.strip():
            self.parts.append(data.strip())
            if self.table_depth:
                self.tables[-1].append(data.strip() + ' ')


def plain_text(value: str, limit: int) -> str:
    parser = PageText()
    parser.feed(value)
    return re.sub(r'\s+', ' ', ' '.join(parser.parts))[:limit]


def readable_url(url: str) -> str:
    # Q-Net's public detail page fills an empty iframe with this public exam
    # table. Read that document directly; never execute scripts from a page.
    parsed = urlsplit(url)
    query = parse_qs(parsed.query)
    subject = query.get('jmCd', [''])[0]
    if (parsed.hostname in ('q-net.or.kr', 'www.q-net.or.kr') and parsed.path == '/crf005.do'
            and query.get('id') == ['crf00503'] and re.fullmatch(r'\d{1,8}', subject)):
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path,
                           urlencode({'id': 'crf00503s02', 'jmCd': subject}), ''))
    return url


def document_text(document: str) -> str:
    parser = PageText()
    parser.feed(document)
    tables = [''.join(parts).strip() for parts in parser.tables]
    relevant = [table for table in tables if re.search(r'시험|접수|일정|20\d{2}', table)]
    if relevant:
        # Preserve column names and row boundaries: flattened snippets confuse
        # registration dates with written/practical examination dates.
        return ('표 자료 (열은 | 로 구분):\n' + '\n\n'.join(relevant))[:3400]
    return re.sub(r'\s+', ' ', ' '.join(parser.parts))[:2400]


def public_url(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        if (parsed.scheme not in ('http', 'https') or not parsed.hostname
                or parsed.username or parsed.password or parsed.port not in (None, 80, 443)
                or len(value) > 2048 or any(ord(c) < 32 for c in value)):
            return False
        host = parsed.hostname.lower().rstrip('.')
        if '.' not in host or host.endswith(('.local', '.internal', '.localhost')):
            return False
        try:
            return ipaddress.ip_address(host).is_global
        except ValueError:
            return True
    except ValueError:
        return False


async def bounded_body(response: httpx.Response, limit: int) -> bytes:
    chunks = bytearray()
    async for chunk in response.aiter_bytes(8192):
        chunks.extend(chunk)
        if len(chunks) > limit:
            raise WebToolError('자료가 너무 커서 읽지 못했습니다.')
    return bytes(chunks)


async def public_address(host: str, port: int) -> str:
    # Pin the actual connection to the validated address; a second DNS lookup
    # by the HTTP client would allow DNS rebinding into the company network.
    async with asyncio.timeout(4):
        rows = await asyncio.to_thread(socket.getaddrinfo, host, port, type=socket.SOCK_STREAM)
    addresses = list(dict.fromkeys(row[4][0] for row in rows))
    if not addresses or any(not ipaddress.ip_address(ip).is_global for ip in addresses):
        raise WebToolError('공개 웹페이지 주소만 읽을 수 있습니다.')
    return next((ip for ip in addresses if ':' not in ip), addresses[0])


async def fetch_public_page(url: str) -> str:
    async with asyncio.timeout(15), httpx.AsyncClient(timeout=8, trust_env=False) as client:
        for _ in range(4):
            if not public_url(url):
                raise WebToolError('공개 웹페이지 주소만 읽을 수 있습니다.')
            parsed = httpx.URL(url)
            address = await public_address(parsed.host, parsed.port or (443 if parsed.scheme == 'https' else 80))
            pinned = parsed.copy_with(host=address)
            async with client.stream('GET', pinned, headers={
                'Host': parsed.netloc.decode('ascii'),
                'User-Agent': 'DreamcatchChatbot/1.0',
                'Accept': 'text/html,text/plain',
            }, extensions={'sni_hostname': parsed.host}) as response:
                if response.is_redirect:
                    url = urljoin(url, response.headers.get('location', ''))
                    continue
                response.raise_for_status()
                media = response.headers.get('content-type', '').lower()
                if not any(kind in media for kind in ('text/html', 'text/plain', 'application/xhtml+xml')):
                    raise WebToolError('이 자료는 웹문서 형식이 아닙니다. 출처 링크에서 확인해 주세요.')
                data = await bounded_body(response, 512 * 1024)
                encoding = response.encoding or 'utf-8'
                # Some Korean official sites declare the charset only in HTML.
                match = re.search(br'charset\s*=\s*["\x27]?([\w-]+)', data[:4096], re.I)
                if match:
                    encoding = match.group(1).decode('ascii')
                try:
                    document = data.decode(encoding, errors='replace')
                except LookupError:
                    document = data.decode('utf-8', errors='replace')
                return document_text(document)
    raise WebToolError('웹페이지 이동이 너무 많아 읽지 못했습니다.')


def safe_search_query(query: str) -> str:
    query = ' '.join(query.split())
    if not query or len(query) > 220:
        raise WebToolError('검색어는 220자 이내로 입력해 주세요.')
    if re.search(r'[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}|\d[\d -]{7,}\d', query):
        raise WebToolError('학번·전화번호·이메일 등 개인정보가 포함된 검색어는 외부로 보내지 않습니다.')
    return query


async def search_web(query: str) -> list[dict]:
    query = safe_search_query(query)
    if ('site:' not in query and re.search(r'[가-힣]{2,}(?:기사|기능사|기술사)', query)
            and re.search(r'일정|접수|시험', query)):
        query = query[:195] + ' site:q-net.or.kr'
    async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
        async with client.stream('POST', settings.chatbot_searxng_url.rstrip('/') + '/search', headers={'X-Real-IP': '127.0.0.1'}, data={
            'q': query, 'format': 'json', 'language': 'ko-KR', 'categories': 'general', 'safesearch': 1,
        }) as response:
            response.raise_for_status()
            payload = json.loads(await bounded_body(response, 1024 * 1024))
    terms = [term.lower() for term in re.findall(r'[가-힣a-zA-Z]{3,}',
             re.sub(r'site:\S+', '', query)) if term not in ('알려줘', '알려주세요', '검색해줘', '해주세요')]
    site = re.search(r'(?:^|\s)site:([a-zA-Z0-9.-]+)', query)
    site_host = site.group(1).lower().rstrip('.') if site else None
    def ranking(item):
        haystack = (str(item.get('title', '')) + ' ' + str(item.get('content', ''))).lower()
        score = sum(len(term) for term in terms if term in haystack)
        try:
            host = urlsplit(str(item.get('url', ''))).hostname or ''
        except ValueError:
            return (False, False, 0)
        official = host == 'q-net.or.kr' or host.endswith(('.q-net.or.kr', '.go.kr', '.ac.kr'))
        return (bool(score) or not terms, official, score)
    candidates = [item for item in payload.get('results', []) if isinstance(item, dict)]
    candidates.sort(key=ranking, reverse=True)
    results = []
    seen = set()
    for item in candidates:
        url = item.get('url', '')
        if not isinstance(url, str) or not public_url(url) or url in seen:
            continue
        host = urlsplit(url).hostname or ''
        if site_host and host != site_host and not host.endswith('.' + site_host):
            continue
        if not ranking(item)[0]:
            continue
        seen.add(url)
        results.append({'url': url, 'title': plain_text(str(item.get('title', '')), 150),
                        'snippet': plain_text(str(item.get('content', '')), 450)})
        if len(results) == 4:
            break
    if not results:
        raise WebToolError('검색 결과를 확보하지 못했습니다. 잠시 후 다시 검색하거나 공식 사이트를 확인해 주세요.')
    return results
