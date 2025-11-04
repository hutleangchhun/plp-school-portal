import { useLanguage } from '../../contexts/LanguageContext';

export default function ProfileInfoDisplay({ formData, calculateBMI, getBMICategory }) {
  const { t } = useLanguage();

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-6 border border-gray-100 rounded-lg bg-white overflow-y-auto">
      {/* Basic Information Display */}
      <div>
        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('personalInformation') || 'Personal Information'}</h4>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-3">
          <div className="">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('username')}</p>
            <p className="text-sm sm:text-base font-medium text-gray-900">{formData.username || '-'}</p>
          </div>
          <div className="">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('emailRequired')}</p>
            <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{formData.email || '-'}</p>
          </div>
          <div className="">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('firstNameRequired')}</p>
            <p className="text-sm sm:text-base font-medium text-gray-900">{formData.first_name || '-'}</p>
          </div>
          <div className="">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('lastNameRequired')}</p>
            <p className="text-sm sm:text-base font-medium text-gray-900">{formData.last_name || '-'}</p>
          </div>
          <div className="">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('gender')}</p>
            <p className="text-sm sm:text-base font-medium text-gray-900">{formData.gender === 'MALE' ? t('male') : t('female') || '-'}</p>
          </div>
          <div className="">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('phone')}</p>
            <p className="text-sm sm:text-base font-medium text-gray-900">{formData.phone || '-'}</p>
          </div>
          <div className="">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('dateOfBirth')}</p>
            <p className="text-sm sm:text-base font-medium text-gray-900">{formData.date_of_birth ? new Date(formData.date_of_birth).toLocaleDateString() : '-'}</p>
          </div>
          <div className="">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('nationality')}</p>
            <p className="text-sm sm:text-base font-medium text-gray-900">{formData.nationality || '-'}</p>
          </div>
        </div>
      </div>

      {/* Role & Teacher Information */}
      {formData.roleNameKh && (
        <div className="border-t-2 pt-4 sm:pt-6">
          <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('teacherInformation') || 'Teacher Information'}</h4>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            <div className="">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('role')}</p>
              <p className="text-sm sm:text-base font-medium text-gray-900">{formData.roleNameKh || '-'}</p>
            </div>
            {formData.teacher_number && (
              <div className="">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('teacherNumber')}</p>
                <p className="text-sm sm:text-base font-medium text-gray-900">{formData.teacher_number}</p>
              </div>
            )}
            {formData.employment_type && (
              <div className="">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('employmentType')}</p>
                <p className="text-sm sm:text-base font-medium text-gray-900">{formData.employment_type}</p>
              </div>
            )}
            {formData.hire_date && (
              <div className="">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('hireDate')}</p>
                <p className="text-sm sm:text-base font-medium text-gray-900">{new Date(formData.hire_date).toLocaleDateString()}</p>
              </div>
            )}
            {formData.gradeLevel && (
              <div className="">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('gradeLevel')}</p>
                <p className="text-sm sm:text-base font-medium text-gray-900">{formData.gradeLevel}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health Information */}
      {(formData.weight_kg || formData.height_cm) && (
        <div className="border-t-2 pt-4 sm:pt-6">
          <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('healthInformation') || 'Health Information'}</h4>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-3">
            {formData.weight_kg && (
              <div className="">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('weight')} ({t('kg')})</p>
                <p className="text-sm sm:text-base font-medium text-gray-900">{formData.weight_kg}</p>
              </div>
            )}
            {formData.height_cm && (
              <div className="">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('height')} ({t('cm')})</p>
                <p className="text-sm sm:text-base font-medium text-gray-900">{formData.height_cm}</p>
              </div>
            )}
            {calculateBMI() && (
              <div className=" border-green-500 pl-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">BMI</p>
                <div className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${getBMICategory(calculateBMI()).bgColor} ${getBMICategory(calculateBMI()).color}`}>
                  {calculateBMI()} - {getBMICategory(calculateBMI()).label}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
