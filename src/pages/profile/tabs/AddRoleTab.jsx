import { Button } from '../../../components/ui/Button';
import Dropdown from '../../../components/ui/Dropdown';
import MultiSelectDropdown from '../../../components/ui/MultiSelectDropdown';
import { secondaryRoleTypeOptions } from '../../../utils/formOptions';

/**
 * AddRoleTab Component
 * Handles secondary role assignment (Provincial/District/Commune Officer)
 */
export default function AddRoleTab({
  secondaryRoleType,
  handleRoleTypeChange,
  secondaryProvinceIds,
  handleSecondaryProvinceChange,
  secondaryDistrictIds,
  handleSecondaryDistrictChange,
  secondaryCommuneIds,
  setSecondaryCommuneIds,
  secondaryProvinces,
  secondaryDistricts,
  secondaryCommunes,
  secondaryLocationLoading,
  isEditingCommuneOfficer,
  secondaryRoleLoading,
  handleSecondaryRoleSubmit,
  handleDeleteSecondaryRole,
  t
}) {
  // Add empty option to role type dropdown
  const roleTypeOptions = [
    { value: '', label: t('selectSecondaryRoleType', 'ជ្រើសរើសប្រភេទតួនាទីបន្ថែម') },
    ...secondaryRoleTypeOptions
  ];

  return (
    <div className="mt-6 bg-white rounded-md border border-gray-200 p-6 sm:p-8 w-full shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
        {t('secondaryRoleTitle', 'បន្ថែមតួនាទីបន្ថែមជាមន្ត្រី')}
      </h2>
      <p className="text-sm text-gray-600 mb-6 max-w-3xl">
        {t(
          'secondaryRoleDescription',
          'អ្នកអាចបន្ថែមតួនាទីបន្ថែមមួយក្នុងនាមជាមន្ត្រីខេត្ត ស្រុក ឬឃុំ តាមខ្លួនឯង។ សូមជ្រើសរើសតែតួនាទីមួយប៉ុណ្ណោះ។'
        )}
      </p>

      <form onSubmit={handleSecondaryRoleSubmit} className="space-y-6">
        {/* Step 1: Select Secondary Role Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('secondaryRoleType', 'ប្រភេទតួនាទីបន្ថែម')} *
          </label>
          <Dropdown
            value={secondaryRoleType}
            onValueChange={handleRoleTypeChange}
            options={roleTypeOptions}
            placeholder={t('selectSecondaryRoleType', 'ជ្រើសរើសប្រភេទតួនាទីបន្ថែម')}
            className="w-full md:w-1/2"
          />
          {secondaryRoleType && (
            <p className="mt-2 text-sm text-green-600">
              ✓{' '}
              {secondaryRoleType === 'PROVINCIAL'
                ? t('provincialOfficer', 'មន្ត្រីខេត្ត')
                : secondaryRoleType === 'DISTRICT'
                ? t('districtOfficer', 'មន្ត្រីស្រុក')
                : t('communeOfficer', 'មន្ត្រីឃុំ')}
            </p>
          )}
        </div>

        {/* Step 2 & 3: Location and Additional Information in Same Row */}
        {secondaryRoleType && (
          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Province - MultiSelectDropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('selectProvince', 'ខេត្ត')} *
                </label>
                <MultiSelectDropdown
                  values={secondaryProvinceIds}
                  onValuesChange={handleSecondaryProvinceChange}
                  options={secondaryProvinces.map((p) => ({
                    value: String(p.id),
                    label: p.name || p.province_name_kh || p.province_name_en || `Province ${p.id}`,
                  }))}
                  placeholder={t('enterProvinceId', 'ជ្រើសរើសខេត្ត')}
                  className="w-full"
                  disabled={secondaryLocationLoading}
                />
              </div>

              {/* District - only for district/commune */}
              {(secondaryRoleType === 'DISTRICT' || secondaryRoleType === 'COMMUNE') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('selectDistrict', 'ស្រុក')} *
                  </label>
                  <MultiSelectDropdown
                    values={secondaryDistrictIds}
                    onValuesChange={handleSecondaryDistrictChange}
                    options={secondaryDistricts.map((d) => ({
                      value: String(d.id),
                      label: d.name || d.district_name_kh || d.district_name_en || `District ${d.id}`,
                    }))}
                    placeholder={t('enterDistrictId', 'ជ្រើសរើសស្រុក')}
                    className="w-full"
                    disabled={secondaryProvinceIds.length === 0 || secondaryLocationLoading}
                  />
                </div>
              )}

              {/* Commune - only for commune */}
              {secondaryRoleType === 'COMMUNE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('selectCommune', 'ឃុំ')} *
                  </label>
                  <MultiSelectDropdown
                    values={secondaryCommuneIds}
                    onValuesChange={setSecondaryCommuneIds}
                    options={secondaryCommunes.map((c) => ({
                      value: String(c.id),
                      label: c.name || c.commune_name_kh || c.commune_name_en || `Commune ${c.id}`,
                    }))}
                    placeholder={t('enterCommuneId', 'ជ្រើសរើសឃុំ')}
                    className="w-full"
                    disabled={secondaryDistrictIds.length === 0 || secondaryLocationLoading}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {secondaryRoleType && (
          <div className="flex justify-start gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={secondaryRoleLoading}
            >
              {secondaryRoleLoading
                ? t('saving', 'កំពុងរក្សាទុក...')
                : isEditingCommuneOfficer
                ? t('updateSecondaryRole', 'ធ្វើបច្ចុប្បន្នភាពតួនាទីបន្ថែម')
                : t('saveSecondaryRole', 'រក្សាទុកតួនាទីបន្ថែម')}
            </Button>
            {isEditingCommuneOfficer && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={secondaryRoleLoading}
                onClick={handleDeleteSecondaryRole}
              >
                {secondaryRoleLoading ? t('deleting', 'កំពុងលុប...') : t('deleteSecondaryRole', 'លុបតួនាទីបន្ថែម')}
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
