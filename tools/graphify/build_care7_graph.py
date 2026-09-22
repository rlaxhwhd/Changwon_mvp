"""Build a local, code-only Graphify graph for the CARE 7+ flow.

Run: uv tool run --from graphifyy python tools/graphify/build_care7_graph.py
No application data, external model calls, or database access.
"""
import json
import sys
from pathlib import Path

from graphify.detect import detect
from graphify.extract import extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from graphify.diagnostics import diagnose_extraction

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '_workspace/graphify-care7/graphify-out'
FILES = '''src_v2/data/careerProcess.ts
src_v2/data/diagnosisResults.ts
src_v2/data/counselRequestsWrite.ts
src_v2/data/counselTrack.ts
src_v2/pages/diagnosis/DiagnosisResult.tsx
src_v2/pages/counsel/CareerCounsel.tsx
src_admin/pages/CounselSession.tsx
src_admin/pages/CounselJournals.tsx
src_admin/components/CounselRecordFields.tsx
src_admin/data/counselRequests.ts
src_admin/data/roadmapGenerated.ts
src_admin/data/roadmap.ts
shared/diagnosisStore.ts
shared/roadmapStore.ts
backend/app/diagnosis.py
backend/app/gates.py
backend/app/counsel.py
backend/app/counsel_records.py
backend/app/counsel_template.py
backend/app/roadmap.py
backend/app/roadmap_generator.py'''.splitlines()


def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / '.graphify_python').write_text(sys.executable, encoding='utf-8')
    (OUT / '.graphify_root').write_text(str(ROOT), encoding='utf-8')
    detection = {'scan_root': str(ROOT), 'total_files': 0, 'total_words': 0, 'files': {}}
    selected = {(ROOT / name).resolve() for name in FILES}
    for folder in sorted({path.parent for path in selected}):
        item = detect(folder)
        for category, paths in item.get('files', {}).items():
            kept = [path for path in paths if Path(path).resolve() in selected]
            detection['files'].setdefault(category, []).extend(kept)
    detection['files'] = {key: sorted(set(paths)) for key, paths in detection['files'].items()}
    detection['total_files'] = sum(map(len, detection['files'].values()))
    detection['total_words'] = sum(len(path.read_text(encoding='utf-8').split()) for path in selected)
    if detection['total_files'] != len(FILES):
        raise RuntimeError('Detection did not find every scoped source file')
    write('.graphify_detect.json', detection)
    print(f"Scoped corpus: {detection['total_files']} code files", flush=True)
    extraction = extract([ROOT / name for name in FILES], cache_root=OUT.parent)
    for record in extraction.get('nodes', []) + extraction.get('edges', []):
        source = record.get('source_file')
        if source:
            path = Path(source)
            if not path.is_absolute():
                path = OUT.parent / path
            try:
                record['source_file'] = path.resolve().relative_to(ROOT).as_posix()
            except ValueError:
                pass
    write('.graphify_ast.json', extraction)
    write('.graphify_extract.json', extraction)
    graph = build_from_json(extraction, root=str(ROOT), directed=True)
    if not graph.number_of_nodes():
        raise RuntimeError('Empty graph')
    communities = cluster(graph)
    labels = {key: f'Code community {key}' for key in communities}
    if not to_json(graph, communities, str(OUT / 'graph.json')):
        raise RuntimeError('Graphify refused to replace graph')
    report = generate(graph, communities, score_all(graph, communities), labels,
                      god_nodes(graph), surprising_connections(graph, communities),
                      detection, {'input': 0, 'output': 0}, str(ROOT),
                      suggested_questions=suggest_questions(graph, communities, labels))
    (OUT / 'GRAPH_REPORT.md').write_text(report, encoding='utf-8')
    health = diagnose_extraction(extraction, directed=True, root=str(ROOT))
    write('graph-health.json', health)
    write('scope.json', {'files': FILES, 'mode': 'local-code-only',
                        'business_flow': 'docs/CARE7_FLOW.md',
                        'limitations': 'Scoped AST graph; HTTP and business transitions require source review.'})
    print(f'Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges, {len(communities)} communities')
    for key in ('dangling_endpoint_edges', 'missing_endpoint_edges', 'self_loop_edges', 'directed_same_endpoint_collapsed_edges'):
        print(f'{key}: {health.get(key, 0)}')
    print(OUT)


if __name__ == '__main__':
    main()
