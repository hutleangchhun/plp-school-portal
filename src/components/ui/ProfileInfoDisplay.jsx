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
          <InfoField label={t('lastName')} value={formData.last_name} />
          <InfoField label={t('firstName')} value={formData.first_name} />
          <InfoField label={t('gender')} value={formData.gender === 'MALE' ? t('male') : t('female')} />
          <InfoField label={t('dateOfBirth')} value={formData.date_of_birth ? new Date(formData.date_of_birth).toLocaleDateString() : '-'} />
          <InfoField label={t('nationality')} value={formData.nationality} />
          <InfoField label={t('ethnicGroup')} value={formData.ethnic_group} />
          <InfoField label={`${t('weight')} (${t('kg')})`} value={formData.weight_kg} />
          <InfoField label={`${t('height')} (${t('cm')})`} value={formData.height_cm} />

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
          {formData.school_name && (
            <InfoField label={t('school')} value={formData.school_name} />
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
          <InfoField label={t('province')} value={formData.residence?.province_name} />
          <InfoField label={t('district')} value={formData.residence?.district_name} />
          <InfoField label={t('commune')} value={formData.residence?.commune_name} />
          <InfoField label={t('village')} value={formData.residence?.village_name} />
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
          <InfoField label={t('province')} value={formData.placeOfBirth?.province_name} />
          <InfoField label={t('district')} value={formData.placeOfBirth?.district_name} />
          <InfoField label={t('commune')} value={formData.placeOfBirth?.commune_name} />
          <InfoField label={t('village')} value={formData.placeOfBirth?.village_name} />
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
          <InfoField label={t('employmentType')} value={formData.employment_type} />
          <InfoField label={t('salaryType')} value={formData.salary_type_name || formData.salary_type} />
          <InfoField label={t('teachingType')} value={formData.teaching_type} />
          <InfoField label={t('teacherStatus')} value={formData.teacher_status} />
          <InfoField label={t('subjects')} value={Array.isArray(formData.subject) ? formData.subject.join(', ') : '-'} />
          <InfoField label={t('teacherNumber')} value={formData.teacher_number} />
          <InfoField label={t('hireDate')} value={formData.hire_date ? new Date(formData.hire_date).toLocaleDateString() : '-'} />
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
        {(formData.education_level || formData.training_type) && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">{t('trainingInformation')}</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-2">
              <InfoField label={t('educationLevel')} value={formData.education_level} />
              <InfoField label={t('trainingType')} value={formData.training_type} />
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
        {formData.teacher_family && (formData.teacher_family.living_status || formData.teacher_family.spouse_info || formData.teacher_family.children) && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">{t('familyInformation')}</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-6 lg:grid-cols-2">
              <InfoField label={t('maritalStatus')} value={formData.teacher_family.living_status} />

              {/* Spouse Information */}
              {formData.teacher_family.spouse_info && (
                <>
                  {formData.teacher_family.spouse_info.spouse_name && (
                    <InfoField label={t('partnerName')} value={formData.teacher_family.spouse_info.spouse_name} />
                  )}
                  {formData.teacher_family.spouse_info.spouse_occupation && (
                    <InfoField label={t('partnerJobPlace')} value={formData.teacher_family.spouse_info.spouse_occupation} />
                  )}
                  {formData.teacher_family.spouse_info.spouse_phone && (
                    <InfoField label={t('partnerPhone')} value={formData.teacher_family.spouse_info.spouse_phone} />
                  )}
                  {formData.teacher_family.spouse_info.spouse_place_of_birth && (
                    <InfoField label={`${t('partnerName')} ${t('placeOfBirth')}`} value={formData.teacher_family.spouse_info.spouse_place_of_birth} />
                  )}
                </>
              )}

              {/* Number of Children */}
              {formData.teacher_family.number_of_children && (
                <InfoField label={t('numberOfChildren')} value={formData.teacher_family.number_of_children} />
              )}
            </div>

            {/* Children List */}
            {formData.teacher_family.children && formData.teacher_family.children.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <h5 className="text-sm font-semibold text-gray-900 mb-4">{t('childrenInformation')}</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.teacher_family.children.map((child, index) => (
                    child && child.child_name && (
                      <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="text-sm font-medium text-gray-600">{t('childName')} {index + 1}</p>
                        <p className="text-sm text-gray-900 font-medium mt-1">{child.child_name}</p>
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
