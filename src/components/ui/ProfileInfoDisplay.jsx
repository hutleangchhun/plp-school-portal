import { useLanguage } from '../../contexts/LanguageContext';

const InfoField = ({ label, value, className = '' }) => (
  <div className={`flex-1 min-w-0 bg-gray-50 border-gray-100 border-2 p-4 rounded-md ${className}`}>
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="text-sm text-gray-900 break-words mt-1">{value || '-'}</p>
  </div>
);

export default function ProfileInfoDisplay({ formData, calculateBMI, getBMICategory }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 overflow-y-auto pb-8">
      {/* Personal Information Card */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 ">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
            {t('personalInformation')}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-4">
          <InfoField label={t('lastName')} value={formData.lastName} />
          <InfoField label={t('firstName')} value={formData.firstName} />
          <InfoField label={t('gender')} value={formData.gender === 'MALE' ? t('male') : t('female')} />
          <InfoField label={t('dateOfBirth')} value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : '-'} />
          <InfoField label={t('nationality')} value={formData.nationality} />
          <InfoField label={t('ethnicGroup')} value={formData.ethnicGroup} />
          <InfoField label={`${t('weight')} (${t('kg')})`} value={formData.weightKg} />
          <InfoField label={`${t('height')} (${t('cm')})`} value={formData.heightCm} />

          {/* Accessibility */}
          {formData.accessibility && formData.accessibility.length > 0 && (
            <div className='col-span-1 md:col-span-2 lg:col-span-4'>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">{t('accessibility')}</p>
              <p className="text-sm text-gray-900">{formData.accessibility.join(', ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Account Information Card */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 ">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
            {t('account', 'Account')}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-4">
          <InfoField label={t('username')} value={formData.username} />
          <InfoField label={t('email')} value={formData.email} />
          <InfoField label={t('phone')} value={formData.phone} />
          {formData.roleNameKh && (
            <InfoField label={t('role')} value={`${formData.roleNameKh} (${formData.roleNameEn})`} />
          )}
          {formData.schoolName && (
            <InfoField label={t('school')} value={formData.schoolName} />
          )}
        </div>
      </div>

      {/* Current Residence Card */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 ">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
            {t('currentResidence')}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-4">
          <InfoField label={t('province')} value={formData.residence?.provinceNameKh || formData.residence?.provinceName} />
          <InfoField label={t('district')} value={formData.residence?.districtNameKh || formData.residence?.districtName} />
          <InfoField label={t('commune')} value={formData.residence?.communeNameKh || formData.residence?.communeName} />
          <InfoField label={t('village')} value={formData.residence?.villageNameKh || formData.residence?.villageName} />
        </div>
      </div>

      {/* Place of Birth Card */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 ">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
            {t('placeOfBirth')}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-4">
          <InfoField label={t('province')} value={formData.placeOfBirth?.provinceNameKh || formData.placeOfBirth?.provinceName} />
          <InfoField label={t('district')} value={formData.placeOfBirth?.districtNameKh || formData.placeOfBirth?.districtName} />
          <InfoField label={t('commune')} value={formData.placeOfBirth?.communeNameKh || formData.placeOfBirth?.communeName} />
          <InfoField label={t('village')} value={formData.placeOfBirth?.villageNameKh || formData.placeOfBirth?.villageName} />
        </div>
      </div>

      {/* Employment Information Card */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 ">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
            {t('employmentInformation')}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-4">
          <InfoField label={t('gradeLevel')} value={formData.gradeLevel} />
          <InfoField label={t('employmentType')} value={formData.employmentType} />
          <InfoField label={t('salaryType')} value={formData.salaryTypeName || formData.salaryType} />
          <InfoField label={t('teachingType')} value={formData.teachingType} />
          <InfoField label={t('teacherStatus')} value={formData.teacherStatus} />
          <InfoField label={t('subjects')} value={Array.isArray(formData.subject) ? formData.subject.join(', ') : '-'} />
          <InfoField label={t('teacherNumber')} value={formData.teacherNumber} />
          <InfoField label={t('hireDate')} value={formData.hireDate ? new Date(formData.hireDate).toLocaleDateString() : '-'} />
        </div>

        {/* BMI Information Subsection */}
        {formData.bmi && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">{t('bmi')}</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-2">
              {typeof formData.bmi === 'object' ? (
                <>
                  <InfoField label={t('bmiValue')} value={formData.bmi.value?.toFixed(1)} />
                  <InfoField label={t('bmiCategory')} value={formData.bmi.category_km || formData.bmi.category} />
                </>
              ) : (
                <InfoField label={t('bmiValue')} value={formData.bmi} />
              )}
            </div>
          </div>
        )}

        {/* Appointment and Burden Status */}
        {(formData.appointed || formData.burden) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('appointmentStatus')}</p>
            <div className="flex items-center gap-6">
              {formData.appointed && (
                <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <span className="h-2 w-2 rounded-full bg-green-600"></span>
                  {t('appointed')}
                </span>
              )}
              {formData.burden && (
                <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <span className="h-2 w-2 rounded-full bg-green-600"></span>
                  {t('burden')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Training Information Subsection */}
        {(formData.educationLevel || formData.trainingType) && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">{t('trainingInformation')}</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-2">
              <InfoField label={t('educationLevel')} value={formData.educationLevel} />
              <InfoField label={t('trainingType')} value={formData.trainingType} />
            </div>
          </div>
        )}

        {/* Extra Learning Tools Subsection */}
        {formData.teacherExtraLearningTool && (() => {
          const getCategoryLabel = (key) => {
            if (key === 'reading_material_package') {
              return t('learningPackage', 'កញ្ចប់សម្ភារៈអំណាន');
            }
            if (key === 'math_grade1_package') {
              return t('mathGrade1', 'គណិតវិទ្យាថ្នាក់ដំបូង');
            }
            return key;
          };

          const getDetailLabel = (key) => {
            if (key === 'picture_cards') {
              return t('pictureCards', 'ប័ណ្ឌរូបភាព');
            }
            if (key === 'manipulatives') {
              return t('manipulatives', 'សម្ភារឧបទេស');
            }
            return key;
          };

          // Check if there's any data to display
          const hasAnyData = Object.entries(formData.teacherExtraLearningTool).some(([_, tools]) => {
            if (!tools) return false;
            // For new format (objects), check if _hasPackage or any detail is true
            if (typeof tools === 'object') {
              return Object.values(tools).some(v => v === true);
            }
            // For legacy format (boolean values)
            return tools === true;
          });

          if (!hasAnyData) return null;

          return (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h4 className="text-base font-medium text-gray-900 mb-4">{t('extraLearningTool')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(formData.teacherExtraLearningTool).map(([category, tools]) => {
                  // Handle new format (objects)
                  if (typeof tools === 'object' && tools !== null) {
                    const detailKeys = Object.keys(tools).filter(k => k !== '_hasPackage');
                    const detailKey = detailKeys[0];
                    const hasPackage = !!tools._hasPackage;
                    const detailFlag = detailKey ? !!tools[detailKey] : false;

                    if (!hasPackage && !detailFlag) return null;

                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <span className="h-2 w-2 rounded-full bg-green-600"></span>
                          {getCategoryLabel(category)}
                        </div>
                        {detailFlag && (
                          <div className="ml-4 flex items-center gap-2 text-sm text-gray-700">
                            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                            {getDetailLabel(detailKey)}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle legacy format (boolean values)
                  if (tools === true) {
                    return (
                      <div key={category} className="flex items-center gap-2 text-sm text-gray-900">
                        <span className="h-2 w-2 rounded-full bg-green-600"></span>
                        {category}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          );
        })()}

        {/* Family Information Subsection */}
        {formData.teacherFamily && (formData.teacherFamily.livingStatus || formData.teacherFamily.spouseInfo || formData.teacherFamily.children) && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">{t('familyInformation')}</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-2">
              <InfoField label={t('maritalStatus')} value={formData.teacherFamily.livingStatus} />

              {/* Spouse Information */}
              {formData.teacherFamily.spouseInfo && (
                <>
                  {formData.teacherFamily.spouseInfo.spouseName && (
                    <InfoField label={t('partnerName')} value={formData.teacherFamily.spouseInfo.spouseName} />
                  )}
                  {formData.teacherFamily.spouseInfo.spouseOccupation && (
                    <InfoField label={t('partnerJobPlace')} value={formData.teacherFamily.spouseInfo.spouseOccupation} />
                  )}
                  {formData.teacherFamily.spouseInfo.spousePhone && (
                    <InfoField label={t('partnerPhone')} value={formData.teacherFamily.spouseInfo.spousePhone} />
                  )}
                  {formData.teacherFamily.spouseInfo.spousePlaceOfBirth && (
                    <InfoField label={`${t('partnerName')} ${t('placeOfBirth')}`} value={formData.teacherFamily.spouseInfo.spousePlaceOfBirth} />
                  )}
                </>
              )}

              {/* Number of Children */}
              {formData.teacherFamily.numberOfChildren && (
                <InfoField label={t('numberOfChildren')} value={formData.teacherFamily.numberOfChildren} />
              )}
            </div>

            {/* Children List */}
            {formData.teacherFamily.children && formData.teacherFamily.children.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <h5 className="text-sm font-semibold text-gray-900 mb-4">{t('childrenInformation')}</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.teacherFamily.children.map((child, index) => (
                    child && child.childName && (
                      <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="text-sm font-medium text-gray-600">{t('childName')} {index + 1}</p>
                        <p className="text-sm text-gray-900 font-medium mt-1">{child.childName}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
