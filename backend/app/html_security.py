"""Shared allowlist for stored rich text; never trust an editor's client-side filter."""
import nh3
from .upload_security import safe_image_url

TAGS = set('p div span br hr strong b em i u s ul ol li blockquote pre code h1 h2 h3 h4 h5 h6 table thead tbody tfoot tr td th caption a img font sub sup'.split())
STYLES = set('color background-color font-size font-family font-weight font-style text-align text-decoration line-height width max-width height border border-collapse padding margin-left'.split())


def attribute_filter(tag, attr, value):
    if tag == 'img' and attr == 'src':
        try:
            return safe_image_url(value)
        except ValueError:
            return None
    if attr == 'style' and any(x in value.lower() for x in ('url(', 'expression', 'var(', '\\')):
        return None
    if attr == 'href' and value.strip().lower().startswith('data:'):
        return None
    return value


def clean_html(value: str) -> str:
    return nh3.clean(value, tags=TAGS,
                     attributes={'*': {'style', 'title', 'align'}, 'a': {'href'},
                                 'img': {'src', 'alt', 'width', 'height'},
                                 'td': {'colspan', 'rowspan'}, 'th': {'colspan', 'rowspan'},
                                 'font': {'color', 'size', 'face'}},
                     clean_content_tags={'script', 'style', 'iframe', 'object', 'svg', 'math'},
                     url_schemes={'http', 'https', 'mailto', 'data'},
                     attribute_filter=attribute_filter, filter_style_properties=STYLES,
                     link_rel='noopener noreferrer')
