"""Evidence projection shared by AI generation paths."""


def diagnosis_factors(factors):
    accepted, excluded = [], []
    for factor in factors:
        issues = factor.get('validationIssues') or []
        if any(issue != 'UNMAPPED_FACTOR' for issue in issues):
            excluded.append({'name': factor.get('name'), 'issues': factor['validationIssues']})
            continue
        values = {key: factor[key] for key in ('name', 'factorCode', 'tScore', 'rawScore', 'percentile', 'level')
                  if key in factor and factor[key] is not None}
        if not any(values.get(key) is not None for key in ('tScore', 'rawScore', 'percentile')):
            excluded.append({'name': factor.get('name'), 'issues': ['MISSING_SCORE']})
            continue
        if 'UNMAPPED_FACTOR' in issues:
            values['definitionStatus'] = 'UNMAPPED_FACTOR'
        accepted.append(values)
    return accepted, excluded


def company_goal(value):
    if isinstance(value, dict):
        # Legacy fixtures contain illustrative match scores and requirement
        # numbers; those are not verified employer requirements/student facts.
        return {key: value[key] for key in ('name', 'role', 'industry') if key in value}
    return value
