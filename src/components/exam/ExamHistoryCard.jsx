import React from 'react';
import Badge from '../ui/Badge';
import { formatDateKhmer } from '../../utils/formatters';
import { formatScore } from '../../utils/scoreUtils';

/**
 * ExamHistoryCard Component
 * Displays a minimal, clean exam record card with selection capability
 *
 * @component
 * @param {Object} exam - Exam data object
 * @param {boolean} isSelected - Whether the card is currently selected
 * @param {Function} onToggle - Callback function when card is toggled
 * @param {Function} getExamTypeLabel - Function to get exam type label
 * @param {Function} t - Translation function
 */
const ExamHistoryCard = ({
  exam,
  isSelected,
  onToggle,
  getExamTypeLabel,
  t
}) => {

  return (
    <div
      onClick={onToggle}
      className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {/* Header: Checkbox, Title, and Score */}
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer mt-1 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
            {exam.examTitle || "-"}
          </h3>
        </div>
        <div className="flex-shrink-0 text-right ml-2">
          <div className="text-lg sm:text-xl font-bold text-blue-600">
            {exam.letterGrade || "-"}
          </div>
          <div className="text-xs text-gray-500">
            {formatScore(exam.percentage || exam.score || 0)}/10
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mb-3" />

      {/* Details */}
      <div className="space-y-2 text-xs sm:text-sm">
        {/* Subject and Date Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Subject, Type, and Skill Badges */}
          <div className="flex items-center justify-start gap-2 flex-wrap">
            <Badge color="blue" variant="outline" size="sm">
              {exam.subjectKhmerName || exam.subjectName || "-"}
            </Badge>
            <Badge color="orange" variant="outline" size="sm">
              {getExamTypeLabel(exam.examType, t)}
            </Badge>
            {exam.skillName && (
              <Badge color="purple" variant="outline" size="sm">
                {exam.skillName}
              </Badge>
            )}
            {exam.status === "completed" && (
              <span className="text-xs font-medium text-green-700 ml-auto">
                ✓ {t("completed", "Completed")}
              </span>
            )}
          </div>
          <div className="text-gray-600 flex-shrink-0 text-right">
            {exam.createdAt ? formatDateKhmer(exam.createdAt, "full") : "-"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamHistoryCard;
