from backend.problem import classify_problem, expand_query


def test_plain_language_workplace_problem_maps_to_posh_terms():
    intent = classify_problem("My boss keeps touching me at work")

    assert intent.topic == "workplace harassment"
    assert "POSH" in intent.search_terms
    assert "Internal Committee" in expand_query("My boss keeps touching me at work")


def test_unknown_problem_keeps_general_legal_scope():
    intent = classify_problem("Can my landlord increase the rent?")

    assert intent.topic == "general legal matter"
    assert intent.search_terms == ()