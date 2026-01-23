import React from 'react';
import { Button } from '../ui/Button';
import { getConvertedExamScore } from '../../utils/scoreUtils';

/**
 * ExamSkillSelectionView Component
 * Displays the skill selection interface for applying exam skills
 *
 * @component
 * @param {Object} exam - The exam data being processed
 * @param {string} subject - The subject key
 * @param {string} subjectName - The subject display name
 * @param {Array} skills - Array of available skills for the subject
 * @param {Set} selectedSkills - Set of currently selected skills
 * @param {Object} skillValues - Object mapping skills to their numeric values
 * @param {Function} onSkillToggle - Callback when a skill is toggled
 * @param {Function} onSkillValueChange - Callback when a skill value is changed
 * @param {Function} onApply - Callback when applying the skills
 * @param {Function} showError - Function to show error messages
 * @param {Function} t - Translation function
 */
const ExamSkillSelectionView = ({
  exam,
  subject,
  subjectName,
  skills,
  selectedSkills,
  skillValues,
  onSkillToggle,
  onSkillValueChange,
  onApply,
  showError,
  t
}) => {

  const handleApplyClick = () => {
    if (selectedSkills.size === 0) {
      showError(
        t("selectSkillsFirst", "Please select at least one skill")
      );
      return;
    }

    const skillsData = {};
    const examScore = getConvertedExamScore(exam);

    selectedSkills.forEach((skill) => {
      const value =
        skillValues[skill] !== undefined && skillValues[skill] !== ""
          ? parseFloat(skillValues[skill])
          : examScore;
      skillsData[skill] = Math.min(value, 10);
    });

    onApply({
      exam,
      subject,
      skills: skillsData
    });
  };

  const examScore = getConvertedExamScore(exam);

  return (
    <div className="h-96 overflow-y-auto">
      <div className="space-y-4 sm:space-y-6 pr-3 sm:pr-4">
        {/* Exam Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-2">
            {exam.examTitle || t("exam", "Exam")}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            {t("score", "Score")}:{" "}
            <span className="font-bold text-blue-600">
              {exam.percentage !== undefined && exam.percentage !== null
                ? `${exam.percentage}%`
                : exam.score !== undefined && exam.score !== null
                ? `${exam.score}/${exam.totalScore || 100}`
                : "-"}
            </span>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {t("subject", "Subject")}:{" "}
            <span className="font-semibold">{subjectName}</span>
          </p>
        </div>

        {/* Skill Selection */}
        <div className="space-y-4">
          <div className="text-xs sm:text-sm font-medium text-gray-700 mb-3">
            {t("selectSkills", "Select Skills for")} {subjectName}
          </div>

          <div className="space-y-3">
            {skills.map((skill) => (
              <div
                key={skill}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedSkills.has(skill)}
                  onChange={() => onSkillToggle(skill)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <label className="flex-1 text-sm font-medium text-gray-900 cursor-pointer">
                  {skill}
                </label>

                {selectedSkills.has(skill) && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={examScore.toString()}
                      value={skillValues[skill] ?? ""}
                      onChange={(e) => onSkillValueChange(skill, e.target.value)}
                      className="flex-1 sm:w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      /10
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedSkills.size > 0 && (
            <div className="mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-700">
                <span className="font-semibold">{selectedSkills.size}</span>{" "}
                {t("skillsSelected", "skills selected")}
              </p>
            </div>
          )}

          {/* Apply Button */}
          <Button
            onClick={handleApplyClick}
            disabled={selectedSkills.size === 0}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
          >
            {t("applySkills", "Apply Skills")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExamSkillSelectionView;
