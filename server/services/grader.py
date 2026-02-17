from __future__ import annotations

from typing import Any


class QuizGrader:
    def __init__(self, default_passing_score: int = 70) -> None:
        self._default_passing_score = default_passing_score

    def grade_quiz(
        self,
        questions: list[dict[str, Any]],
        answers: dict[str, Any],
        passing_score: int | None = None,
    ) -> dict[str, Any]:
        total_questions = len(questions)
        correct_count = 0
        normalized_passing_score = passing_score if passing_score is not None else self._default_passing_score
        results: list[dict[str, Any]] = []

        for question in questions:
            if not isinstance(question, dict):
                continue

            question_id = question.get("id")
            q_type = question.get("type")
            user_answer = answers.get(question_id) if isinstance(answers, dict) else None
            correct = False
            correct_answer: Any = None
            explanation = question.get("explanation", "")

            if q_type == "multiple_choice":
                correct_answer = question.get("correctIndex")
                correct = (
                    isinstance(user_answer, int)
                    and not isinstance(user_answer, bool)
                    and user_answer == correct_answer
                )
            elif q_type == "true_false":
                correct_answer = question.get("correctAnswer")
                correct = isinstance(user_answer, bool) and user_answer == correct_answer
            elif q_type == "multi_select":
                correct_answer = question.get("correctIndices")
                correct = self._multi_select_match(user_answer, correct_answer)
            else:
                correct_answer = question.get("correctAnswer")
                correct = False

            if correct:
                correct_count += 1

            results.append(
                {
                    "questionId": question_id,
                    "correct": correct,
                    "userAnswer": user_answer,
                    "correctAnswer": correct_answer,
                    "explanation": explanation,
                }
            )

        score = int((correct_count / total_questions) * 100) if total_questions else 0
        passed = score >= normalized_passing_score

        return {
            "score": score,
            "totalQuestions": total_questions,
            "correctCount": correct_count,
            "passed": passed,
            "results": results,
        }

    @staticmethod
    def _multi_select_match(user_answer: Any, correct_answer: Any) -> bool:
        normalized_user = QuizGrader._normalize_int_list(user_answer)
        normalized_correct = QuizGrader._normalize_int_list(correct_answer)

        if normalized_user is None or normalized_correct is None:
            return False

        return sorted(normalized_user) == sorted(normalized_correct)

    @staticmethod
    def _normalize_int_list(value: Any) -> list[int] | None:
        if not isinstance(value, list):
            return None

        normalized: list[int] = []
        for item in value:
            if isinstance(item, bool):
                return None
            if not isinstance(item, int):
                return None
            normalized.append(item)

        return normalized
