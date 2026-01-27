import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLoading } from "../../contexts/LoadingContext";
import { scoreService } from "../../utils/api/services/scoreService";
import { getFullName } from "../../utils/usernameUtils";
import { PageLoader } from "../../components/ui/DynamicLoader";
import EmptyState from "../../components/ui/EmptyState";
import { Trophy, Download, Printer } from "lucide-react";
import honorTabBorder from "../../assets/honorTabBorder.png";
import pkachanEmblem from "../../assets/pkachan.png";
import ProfileImage from "../../components/ui/ProfileImage";

/**
 * Score calculation utilities
 */
const calculateAverageScore = (scores) => {
  const validScores = scores.filter((s) => typeof s === "number" && s > 0);
  if (validScores.length === 0) return 0;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
};

/**
 * Helper function to convert Arabic numerals to Khmer numerals
 * @param {string|number} num - Number to convert
 * @returns {string} Khmer numerals
 */
const toKhmerNumerals = (num) => {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num).split('').map(digit => khmerDigits[parseInt(digit)] || digit).join('');
};

/**
 * Helper function to get grade letter
 * @param {number} average - Average score
 * @returns {string} Grade letter
 */
const getGrade = (average) => {
  if (average >= 90) return "A";
  if (average >= 80) return "B";
  if (average >= 70) return "C";
  if (average >= 60) return "D";
  return "F";
};

// Note: CornerOrnament removed - now using KhmerBorder component for all decorations

// Ribbon Badge Component for Rankings
const RibbonBadge = ({ rank, name, score, grade, t }) => {
  const getRankLabel = (rank) => {
    switch (rank) {
      case 1:
        return "លេខ ១ពូកា";
      case 2:
        return "លេខ ២ ប្រាក់";
      case 3:
        return "លេខ ៣ ស្ពាន់";
      case 4:
        return "លេខ ៤";
      case 5:
        return "លេខ ៥";
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Label */}
      <div className="text-red-600 font-bold mb-2 text-sm">
        {t("honorRank", "ជោគជា")}
      </div>

      {/* Ribbon Container */}
      <div className="relative">
        {/* Ribbon SVG Background */}
        <svg
          width="200"
          height="60"
          viewBox="0 0 200 60"
          className="drop-shadow-md"
        >
          {/* Left ribbon tail */}
          <polygon
            points="0,15 20,0 20,50 0,60"
            fill="#f97316"
            opacity="0.9"
          />
          {/* Main ribbon body */}
          <rect x="20" y="0" width="160" height="50" fill="#f97316" />
          {/* Right ribbon tail */}
          <polygon
            points="180,0 200,15 200,60 180,50"
            fill="#f97316"
            opacity="0.9"
          />
          {/* Shadow/depth lines */}
          <line
            x1="0"
            y1="40"
            x2="20"
            y2="30"
            stroke="#c2410c"
            strokeWidth="1.5"
          />
          <line
            x1="180"
            y1="30"
            x2="200"
            y2="40"
            stroke="#c2410c"
            strokeWidth="1.5"
          />
        </svg>

        {/* Ribbon Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-white font-bold text-lg px-4">
              {getRankLabel(rank)}
            </div>
          </div>
        </div>
      </div>

      {/* Student Info Below Ribbon */}
      <div className="mt-4 text-center">
        <p className="font-semibold text-gray-900 text-lg">{name}</p>
        <p className="text-sm text-gray-600">
          {t("average", "Average")}: <span className="font-bold text-blue-600">{score}</span> | {t("grade", "Grade")}: <span className="font-bold">{grade}</span>
        </p>
      </div>
    </div>
  );
};

/**
 * HonorRollTab Component
 * Displays top 5 students in a certificate-style layout
 */
export default function HonorRollTab({
  selectedClass,
  selectedClassName,
  globalFilterMonth,
  globalFilterYear,
  t,
}) {
  const { startLoading, stopLoading } = useLoading();

  // State for Honor Roll Data
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterMonth, setFilterMonth] = useState(globalFilterMonth || new Date().getMonth() + 1);
  const [filterAcademicYear, setFilterAcademicYear] = useState(
    globalFilterYear || new Date().getFullYear().toString(),
  );

  // Sync with global filters
  useEffect(() => {
    if (globalFilterMonth) setFilterMonth(globalFilterMonth);
    if (globalFilterYear) setFilterAcademicYear(globalFilterYear);
  }, [globalFilterMonth, globalFilterYear]);

  /**
   * Fetch monthly exam scores for the selected class and month
   */
  const fetchMonthlyScores = useCallback(async () => {
    try {
      if (!selectedClass) {
        setMonthlyRecords([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      startLoading(
        "fetchHonorRollScores",
        t("loadingExamRecords", "Loading exam records..."),
      );

      const year = parseInt(filterAcademicYear);
      const month = filterMonth;

      // Use service function to fetch monthly scores
      const response = await scoreService.getMonthlyExamScores({
        classId: selectedClass,
        month,
        year,
      });

      if (response.success) {
        setMonthlyRecords(response.data);
        setError(null);
      } else {
        setMonthlyRecords([]);
        setError(t("errorFetchingExamRecords", "Failed to fetch exam records"));
      }
    } catch (error) {
      console.error("Error fetching monthly scores:", error);
      setError(
        error?.message ||
          t("errorFetchingExamRecords", "Failed to fetch exam records"),
      );
      setMonthlyRecords([]);
    } finally {
      setLoading(false);
      stopLoading("fetchHonorRollScores");
    }
  }, [selectedClass, filterMonth, filterAcademicYear, startLoading, stopLoading, t]);

  /**
   * Fetch monthly scores when class or filters change
   */
  useEffect(() => {
    if (selectedClass) {
      // Reset data while fetching new data
      setMonthlyRecords([]);
      fetchMonthlyScores();
    }
  }, [selectedClass, filterMonth, filterAcademicYear, fetchMonthlyScores]);

  /**
   * Calculate top 5 students with averages
   */
  const topStudents = useMemo(() => {
    const studentsWithAverages = monthlyRecords.map((record) => {
      const studentName = getFullName(record.student || {}, "Unknown");

      // Calculate total average (all subjects)
      const allScores = [
        record.khmerListening,
        record.khmerWriting,
        record.khmerReading,
        record.khmerSpeaking,
        record.mathNumber,
        record.mathGeometry,
        record.mathStatistic,
        record.science,
        record.socialStudies,
        record.sport,
        record.healthHygiene,
        record.lifeSkills,
        record.foreignLanguage,
      ];
      const totalAverage = calculateAverageScore(allScores);
      const grade = getGrade(totalAverage);

      return {
        id: `student-${record.studentId}`,
        studentName,
        totalAverage,
        grade,
        record,
      };
    });

    // Sort by average descending and take top 5
    return studentsWithAverages
      .sort((a, b) => b.totalAverage - a.totalAverage)
      .slice(0, 5)
      .map((student, index) => ({
        ...student,
        rank: index + 1,
      }));
  }, [monthlyRecords]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Future implementation: Export as PDF or image
    alert(t("downloadFeatureComingSoon", "Download feature coming soon!"));
  };

  return (
    <div className="mt-6">
      {/* Action Buttons */}
      {!loading && !error && monthlyRecords.length > 0 && topStudents.length > 0 && (
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            {t("print", "Print")}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("download", "Download")}
          </button>
        </div>
      )}

      {/* Results */}
      <div className="bg-white overflow-hidden rounded-lg shadow">
        {!selectedClass ? (
          <EmptyState
            icon={Trophy}
            title={t("selectClassFirst", "Select a Class")}
            description={t(
              "selectClassFirstDesc",
              "Please select a class from the filters above to view honor roll",
            )}
          />
        ) : loading ? (
          <PageLoader
            message={t("loadingExamRecords", "Loading exam records...")}
          />
        ) : error ? (
          <EmptyState
            icon={Trophy}
            title={t("error", "Error")}
            description={error}
            actionLabel={t("retry", "Retry")}
            onAction={fetchMonthlyScores}
          />
        ) : monthlyRecords.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={t("noStudents", "No Students")}
            description={t(
              "noStudentsInClass",
              "No students found in this class for the selected month",
            )}
          />
        ) : (
          topStudents.length > 0 && (
            <div className="p-8 md:p-12">
              {/* Two Column Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
                
                {/* Left Column - Certificate Picture */}
                <div className="certificate-container relative bg-white rounded-lg p-8 md:p-12 w-full print:max-w-[800px] print:mx-auto" style={{ aspectRatio: '3/4' }}>
                  {/* Khmer Border Image */}
                  <img 
                    src={honorTabBorder}
                    alt="Khmer Certificate Border"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ opacity: 0.95 }}
                  />

                  {/* Certificate Content */}
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    {/* Header */}
                    <div className="text-center mb-4">
                      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Moul, serif' }}>
                        {t("honorRollCertificateTitle", "ព្រះរាជាណាចក្រកម្ពុជា")}
                      </h1>
                      <h2 className="text-md md:text-md font-semibold text-gray-800 mb-1" style={{ fontFamily: 'Moul, serif' }}>
                        {t("nationReligionKing", "ជាតិ សាសនា ព្រះមហាក្សត្រ")}
                      </h2>
                      {/* Khmer Royal Emblem */}
                      <div className="flex justify-center my-2">
                        <img 
                          src={pkachanEmblem}
                          alt="Khmer Royal Emblem"
                          className="w-32 object-contain opacity-70"
                        />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-800" style={{ fontFamily: 'Moul, serif' }}>
                        {t("honorRollTitle", "តារាងកិត្តិយស")}
                      </h3>
                      <p className="text-base text-gray-800 mt-2" style={{ fontFamily: 'Moul, serif' }}>
                        {t("monthlyExamResults", "ប្រចាំខែ")} {
                          [
                            t("january", "មករា"),
                            t("february", "កុម្ភៈ"),
                            t("march", "មីនា"),
                            t("april", "មេសា"),
                            t("may", "ឧសភា"),
                            t("june", "មិថុនា"),
                            t("july", "កក្កដា"),
                            t("august", "សីហា"),
                            t("september", "កញ្ញា"),
                            t("october", "តុលា"),
                            t("november", "វិច្ឆិកា"),
                            t("december", "ធ្នូ"),
                          ][filterMonth - 1]
                        } ឆ្នាំ {toKhmerNumerals(filterAcademicYear)}
                      </p>
                    </div>

                    {/* Class Info */}
                    <div className="text-center mb-4 text-gray-700">
                      <p className="text-base">
                        <span className="text-gray-800 font-bold">
                          {selectedClassName || t("noClass", "N/A")}
                        </span>
                      </p>
                    </div>

                    {/* Top 5 Students in Pyramid Layout */}
                    <div className="flex-1 flex flex-col justify-center space-y-8">
                      {/* 1st Place - Center Top */}
                      {topStudents[0] && (
                        <div className="flex justify-center">
                          <div className="text-center">
                            <p className="text-base font-bold text-red-600 mb-3">លេខ១</p>
                            <div className="mx-auto mb-3 shadow-md">
                              <ProfileImage
                                user={topStudents[0].record?.student}
                                size="custom"
                                customSize="w-32 h-32"
                                rounded="md"
                                borderColor="border-gray-400"
                                alt={topStudents[0].studentName}
                                fallbackType="image"
                              />
                            </div>
                            <p className="font-bold text-gray-900 text-base">
                              {topStudents[0].studentName}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 2nd & 3rd Place - Middle Row */}
                      <div className="grid grid-cols-2 gap-12 max-w-lg mx-auto">
                        {topStudents[1] && (
                          <div className="text-center">
                            <p className="text-sm font-bold text-red-600 mb-2">លេខ២</p>
                            <div className="mx-auto mb-2 shadow-sm">
                              <ProfileImage
                                user={topStudents[1].record?.student}
                                size="custom"
                                customSize="w-28 h-28"
                                rounded="md"
                                borderColor="border-gray-400"
                                alt={topStudents[1].studentName}
                                fallbackType="image"
                              />
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {topStudents[1].studentName}
                            </p>
                          </div>
                        )}
                        {topStudents[2] && (
                          <div className="text-center">
                            <p className="text-sm font-bold text-red-600 mb-2">លេខ៣</p>
                            <div className="mx-auto mb-2 shadow-sm">
                              <ProfileImage
                                user={topStudents[2].record?.student}
                                size="custom"
                                customSize="w-28 h-28"
                                rounded="md"
                                borderColor="border-gray-400"
                                alt={topStudents[2].studentName}
                                fallbackType="image"
                              />
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {topStudents[2].studentName}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 4th & 5th Place - Bottom Row */}
                      <div className="grid grid-cols-2 gap-12 max-w-lg mx-auto">
                        {topStudents[3] && (
                          <div className="text-center">
                            <p className="text-sm font-bold text-red-600 mb-2">លេខ៤</p>
                            <div className="mx-auto mb-2 shadow-sm">
                              <ProfileImage
                                user={topStudents[3].record?.student}
                                size="custom"
                                customSize="w-28 h-28"
                                rounded="md"
                                borderColor="border-gray-400"
                                alt={topStudents[3].studentName}
                                fallbackType="image"
                              />
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {topStudents[3].studentName}
                            </p>
                          </div>
                        )}
                        {topStudents[4] && (
                          <div className="text-center">
                            <p className="text-sm font-bold text-red-600 mb-2">លេខ៥</p>
                            <div className="mx-auto mb-2 shadow-sm">
                              <ProfileImage
                                user={topStudents[4].record?.student}
                                size="custom"
                                customSize="w-28 h-28"
                                rounded="md"
                                borderColor="border-gray-400"
                                alt={topStudents[4].studentName}
                                fallbackType="image"
                              />
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {topStudents[4].studentName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 grid grid-cols-2 gap-4 text-gray-700 text-sm">
                      <div className="text-center">
                        <p className="font-semibold">{t("director", "នាយកសាលា")}</p>
                        <p className="mt-4 text-xs">______________</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs">
                          {t("issuedDate", "ថ្ងៃទី ២៥ ខែមករា ឆ្នាំ២០២៦")}
                        </p>
                        <p className="font-semibold mt-4">{t("teacherSignature", "គ្រូបង្រៀនប្រចាំថ្នាក់")}</p>
                        <p className="mt-2 text-xs">______________</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Honor Roll Rankings */}
                <div className="space-y-6 print:hidden">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      {t("honorRoll", "Honor Roll Rankings")}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      {t("topStudentsDesc", "Top 5 students based on monthly exam averages")}
                    </p>
                  </div>

                  {/* Detailed Rankings */}
                  <div className="space-y-4">
                    {topStudents.map((student) => (
                      <div
                        key={student.id}
                        className="bg-white border-2 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        style={{
                          borderLeftWidth: '6px',
                          borderLeftColor: 
                            student.rank === 1 ? '#059669' : 
                            student.rank === 2 ? '#3b82f6' : 
                            student.rank === 3 ? '#8b5cf6' : '#f59e0b'
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600 mb-1">
                              {student.rank === 1 ? "🥇 1st Place" :
                               student.rank === 2 ? "🥈 2nd Place" :
                               student.rank === 3 ? "🥉 3rd Place" :
                               `${student.rank}th Place`}
                            </p>
                            <p className="font-bold text-lg text-gray-900">
                              {student.studentName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-blue-600">
                              {student.totalAverage.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">{t("average", "Average")}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">{t("grade", "Grade")}: </span>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                              student.grade === 'A' ? 'bg-green-100 text-green-800' :
                              student.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              student.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              student.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {student.grade}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          /* Hide everything except the certificate */
          .certificate-container {
            page-break-inside: avoid;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 1cm !important;
            width: 21cm !important;
            height: 29.7cm !important;
            aspect-ratio: auto !important;
          }
          
          /* Hide outer padding containers when printing */
          .certificate-container ~ * {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
