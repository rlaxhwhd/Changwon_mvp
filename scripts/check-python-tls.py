"""Fail if an installed Python TLS bundle still trusts the compromised emSign G3 root.

Run with each environment's Python, including inside built containers.
This does not establish whether an environment has previously been compromised.
"""
import importlib
import importlib.metadata
import ssl
import sys

BAD_ROOT = 'emSign ECC Root CA - G3'
failures = []

for package, minimum in [('pip', (26, 2, 2)), ('certifi', (2026, 10, 19))]:
    try:
        version = importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError:
        if package == 'certifi':
            failures.append('certifi is missing')
        print(f'{package}: not installed')
        continue
    print(f'{package}: {version}')
    if tuple(int(part) for part in version.split('.')) < minimum:
        failures.append(f'{package} is below the security minimum')

for module_name in ('certifi', 'pip._vendor.certifi'):
    try:
        module = importlib.import_module(module_name)
    except ImportError:
        continue
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.load_verify_locations(cafile=module.where())
    compromised = any(BAD_ROOT in str(cert['subject']) for cert in context.get_ca_certs())
    print(f'{module_name} CA bundle: {"FAIL" if compromised else "OK"}')
    if compromised:
        failures.append(f'{module_name} trusts the compromised root')

compromised = any(
    BAD_ROOT in str(cert['subject'])
    for cert in ssl.create_default_context().get_ca_certs()
)
print(f'default SSL CA store: {"FAIL" if compromised else "OK"}')
if compromised:
    failures.append('default SSL CA store trusts the compromised root')

for failure in failures:
    print(f'FAIL: {failure}', file=sys.stderr)
sys.exit(bool(failures))
