import React, { useState } from 'react';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';

/**
 * Exam Skill Selection Modal
 * Allows users to select specific subject and skills to apply from an exam
 */
const ExamSkillSelectionModal = ({
  isOpen = false,
  exam = null,
  subjectSkills = {},
  onApply = null,
  onClose = null
}) => {
  const { t } = useLanguage();

  // State for skill selection
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState(new Set());
  const [skillValues, setSkillValues] = useState({});

  if (!isOpen || !exam) return null;

  // Get matched subject from exam
  const examSubject = exam.subjectName?.toLowerCase() || '';
  const getExamScore = () => {
    return exam.percentage !== undefined && exam.percentage !== null
      ? exam.percentage
      : exam.score !== undefined && exam.score !== null
      ? exam.score
      : 0;
  };

  // Available subjects for khmer and math with skills
  const selectableSubjects = [
    {
      key: 'khmer',
      name: 'Khmer',
      skills: subjectSkills.khmer?.skills || ['Listening', 'Writing', 'Reading', 'Speaking'],
      isMatch: examSubject.includes('khmer')
    },
    {
      key: 'math',
      name: 'Math',
      skills: subjectSkills.math?.skills || ['Number', 'Geometry', 'Statistics'],
      isMatch: examSubject.includes('math') || examSubject.includes('mathematics')
    }
  ];

  const handleSubjectSelect = (subjectKey) => {
    setSelectedSubject(subjectKey);
    setSelectedSkills(new Set());
    setSkillValues({});
  };

  const toggleSkillSelection = (skill) => {
    const newSelection = new Set(selectedSkills);
    if (newSelection.has(skill)) {
      newSelection.delete(skill);
    } else {
      newSelection.add(skill);
    }
    setSelectedSkills(newSelection);
  };

  const handleSkillValueChange = (skill, value) => {
    // Allow typing freely, validate numbers
    if (value === '' || value === '.') {
      setSkillValues(prev => ({
        ...prev,
        [skill]: value
      }));
      return;
    }

    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      // Clamp to 0-10
      const clampedValue = Math.max(0, Math.min(parsed, 10));
      setSkillValues(prev => ({
        ...prev,
        [skill]: clampedValue
      }));
    }
  };

  const handleApply = () => {
    if (!selectedSubject || selectedSkills.size === 0) {
      return;
    }

    const skillsData = {};
    selectedSkills.forEach(skill => {
      // Use entered value or exam score
      const value = skillValues[skill] !== undefined && skillValues[skill] !== ''
        ? parseFloat(skillValues[skill])
        : getExamScore();
      skillsData[skill] = Math.min(value, 10);
    });

    if (onApply) {
      onApply({
        exam,
        subject: selectedSubject,
        skills: skillsData
      });
    }
  };

  const currentSubject = selectedSubject ? selectableSubjects.find(s => s.key === selectedSubject) : null;
  const examScore = getExamScore();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('selectExamSkills', 'Select Skills to Apply')}
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                {exam.examTitle || t('exam', 'Exam')} - Score: {examScore}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Subject Selection */}
          {!selectedSubject ? (
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 mb-4">
                {t('selectSubject', 'Select Subject')}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectableSubjects.map(subject => (
                  <button
                    key={subject.key}
                    onClick={() => handleSubjectSelect(subject.key)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      subject.isMatch
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{subject.name}</span>
                      {subject.isMatch && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                          {t('autoDetected', 'Auto-detected')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {subject.skills.length} {t('skills', 'skills')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Step 2: Skill Selection and Value Input
            <div className="space-y-4">
              <button
                onClick={() => {
                  setSelectedSubject(null);
                  setSelectedSkills(new Set());
                  setSkillValues({});
                }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm mb-2"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('changeSubject', 'Change Subject')}
              </button>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">
                  {t('selectSkills', 'Select Skills for')} {currentSubject?.name}
                </div>

                <div className="space-y-3">
                  {currentSubject?.skills.map(skill => (
                    <div
                      key={skill}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSkills.has(skill)}
                        onChange={() => toggleSkillSelection(skill)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />

                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-900 cursor-pointer block">
                          {skill}
                        </label>
                      </div>

                      {selectedSkills.has(skill) && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={examScore.toString()}
                            value={skillValues[skill] ?? ''}
                            onChange={(e) => handleSkillValueChange(skill, e.target.value)}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span className="text-xs text-gray-500">/10</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedSkills.size > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">{selectedSkills.size}</span> {t('skillsSelected', 'skills selected')}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {t('leaveEmptyForExamScore', 'Leave value empty to use exam score')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {t('cancel', 'Cancel')}
          </Button>

          {selectedSubject && (
            <Button
              onClick={handleApply}
              disabled={selectedSkills.size === 0}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('applySkills', 'Apply Skills')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamSkillSelectionModal;
