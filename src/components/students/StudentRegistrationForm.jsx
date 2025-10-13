import { useState, useRef, useEffect } from 'react';
import { User, User2, Building, Mail, Phone, Lock, EyeOff, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { DatePickerWithDropdowns } from '../ui/date-picker-with-dropdowns';
import Dropdown from '../ui/Dropdown';
import { useLocationData } from '../../hooks/useLocationData';
import { studentService } from '../../utils/api/services/studentService';

const StudentRegistrationForm = ({ onSuccess, onCancel }) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Form, 2: Confirmation

  const [registrationForm, setRegistrationForm] = useState({
    // Student Information
    firstName: '',
    lastName: '',
    studentNumber: '',
    phone: '',
    gender: '',
    dateOfBirth: null,
    nationality: '',
    relationship: 'FATHER',
    residence: {
      provinceId: '',
      districtId: '',
      communeId: '',
      villageId: ''
    },
    placeOfBirth: {
      provinceId: '',
      districtId: '',
      communeId: '',
      villageId: ''
    },
    // Parent Information - Array to support multiple parents
    parents: [
      {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        occupation: '',
        residence: {
          provinceId: '',
          districtId: '',
          communeId: '',
          villageId: ''
        }
      },
      {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        occupation: '',
        relationship: 'MOTHER',
        residence: {
          provinceId: '',
          districtId: '',
          communeId: '',
          villageId: ''
        }
      }
    ]
  });

  const [formErrors, setFormErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Location data hooks for residence
  const {
    selectedProvince: selectedResidenceProvince,
    selectedDistrict: selectedResidenceDistrict,
    selectedCommune: selectedResidenceCommune,
    selectedVillage: selectedResidenceVillage,
    handleProvinceChange: handleResidenceProvinceChange,
    handleDistrictChange: handleResidenceDistrictChange,
    handleCommuneChange: handleResidenceCommuneChange,
    handleVillageChange: handleResidenceVillageChange,
    getProvinceOptions: getResidenceProvinceOptions,
    getDistrictOptions: getResidenceDistrictOptions,
    getCommuneOptions: getResidenceCommuneOptions,
    getVillageOptions: getResidenceVillageOptions,
    setInitialValues: setResidenceInitialValues,
    resetSelections: resetResidenceSelections
  } = useLocationData();

  // Location data hooks for place of birth
  const {
    selectedProvince: selectedBirthProvince,
    selectedDistrict: selectedBirthDistrict,
    selectedCommune: selectedBirthCommune,
    selectedVillage: selectedBirthVillage,
    handleProvinceChange: handleBirthProvinceChange,
    handleDistrictChange: handleBirthDistrictChange,
    handleCommuneChange: handleBirthCommuneChange,
    handleVillageChange: handleBirthVillageChange,
    getProvinceOptions: getBirthProvinceOptions,
    getDistrictOptions: getBirthDistrictOptions,
    getCommuneOptions: getBirthCommuneOptions,
    getVillageOptions: getBirthVillageOptions,
    setInitialValues: setBirthInitialValues,
    resetSelections: resetBirthSelections
  } = useLocationData();



  // Form validation
  useEffect(() => {
    const errors = {};
    let isValid = true;

    // Required fields validation
    if (!registrationForm.firstName.trim()) {
      errors.firstName = 'នាមខ្លួនត្រូវបានទាមទារ';
      isValid = false;
    }

    if (!registrationForm.lastName.trim()) {
      errors.lastName = 'នាមត្រកូលត្រូវបានទាមទារ';
      isValid = false;
    }

    // Student number is now optional
    // if (!registrationForm.studentNumber.trim()) {
    //   errors.studentNumber = 'លេខសិស្សត្រូវបានទាមទារ';
    //   isValid = false;
    // }

    // Phone is now optional for students
    // if (!registrationForm.phone.trim()) {
    //   errors.phone = t('phoneRequired', 'Phone number is required');
    //   isValid = false;
    // }

    if (!registrationForm.gender) {
      errors.gender = 'ភេទត្រូវបានទាមទារ';
      isValid = false;
    }

    if (!registrationForm.dateOfBirth) {
      errors.dateOfBirth = 'ថ្ងៃខែឆ្នាំកំណើតត្រូវបានទាមទារ';
      isValid = false;
    }

    // Parent information validation - check each parent
    registrationForm.parents.forEach((parent, index) => {
      if (!parent.firstName.trim()) {
        errors[`parent${index}FirstName`] = `អាណាព្យាបាលទី ${index + 1} នាមខ្លួនត្រូវបានទាមទារ`;
        isValid = false;
      }

      if (!parent.lastName.trim()) {
        errors[`parent${index}LastName`] = `អាណាព្យាបាលទី ${index + 1} នាមត្រកូលត្រូវបានទាមទារ`;
        isValid = false;
      }

      if (parent.email.trim() && !/\S+@\S+\.\S+/.test(parent.email)) {
        errors[`parent${index}Email`] = 'សូមបញ្ចូលអ៊ីមែលដែលត្រឹមត្រូវ';
        isValid = false;
      }

      if (!parent.phone.trim()) {
        errors[`parent${index}Phone`] = `អាណាព្យាបាលទី ${index + 1} លេខទូរស័ព្ទត្រូវបានទាមទារ`;
        isValid = false;
      }
    });

    setFormErrors(errors);
    setIsFormValid(isValid);
  }, [registrationForm, t]);

  const resetForm = () => {
    setRegistrationForm({
      firstName: '',
      lastName: '',
      studentNumber: '',
      phone: '',
      gender: '',
      dateOfBirth: null,
      nationality: '',
      accessibility: [],
      minorityEthnicGroup: '',
      residence: { provinceId: '', districtId: '', communeId: '', villageId: '' },
      placeOfBirth: { provinceId: '', districtId: '', communeId: '', villageId: '' },
      parents: [
        {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          occupation: '',
          residence: {
            provinceId: '',
            districtId: '',
            communeId: '',
            villageId: ''
          }
        },
        {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          occupation: '',
          relationship: 'MOTHER',
          residence: {
            provinceId: '',
            districtId: '',
            communeId: '',
            villageId: ''
          }
        }
      ]
    });
    resetResidenceSelections();
    resetBirthSelections();
    setFormErrors({});
    setCurrentStep(1);
  };

  const handleFormChange = (field, value, parentIndex = null) => {
    if (field === 'parent' && parentIndex !== null) {
      setRegistrationForm(prev => ({
        ...prev,
        parents: prev.parents.map((parent, index) =>
          index === parentIndex ? { ...parent, ...value } : parent
        )
      }));
    } else if (field === 'accessibility' || field === 'minorityEthnicGroup') {
      // Handle checkbox arrays
      setRegistrationForm(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      setRegistrationForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleCheckboxChange = (field, value, checked) => {
    setRegistrationForm(prev => ({
      ...prev,
      [field]: checked
        ? [...(prev[field] || []), value]
        : (prev[field] || []).filter(item => item !== value)
    }));
  };

  const addParent = () => {
    setRegistrationForm(prev => ({
      ...prev,
      parents: [
        ...prev.parents,
        {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          occupation: '',
          relationship: prev.parents.length === 0 ? 'FATHER' : 'MOTHER'
        }
      ]
    }));
  };

  const removeParent = (index) => {
    if (registrationForm.parents.length > 1) {
      setRegistrationForm(prev => ({
        ...prev,
        parents: prev.parents.filter((_, i) => i !== index)
      }));
    }
  };

  const goToNextStep = () => {
    if (currentStep === 1 && isFormValid) {
      setCurrentStep(2);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setLoading(true);

      // Normalize date to dd/mm/yyyy format
      const formatDate = (val) => {
        if (!val) return undefined;
        const d = val instanceof Date ? val : new Date(val);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${day}/${m}/${y}`;
      };

      // Prepare student data for registration
      const studentData = {
        first_name: registrationForm.firstName?.trim(),
        last_name: registrationForm.lastName?.trim(),
        student_number: registrationForm.studentNumber?.trim(),
        phone: registrationForm.phone?.trim() || undefined,
        date_of_birth: formatDate(registrationForm.dateOfBirth),
        gender: registrationForm.gender || undefined,
        nationality: registrationForm.nationality?.trim() || undefined,
        accessibility: registrationForm.accessibility?.length > 0 ? registrationForm.accessibility : undefined,
        minority_ethnic_group: registrationForm.minorityEthnicGroup?.trim() || undefined,
        roleId: 9, // Student role ID
        residence: {
          provinceId: selectedResidenceProvince || registrationForm.residence.provinceId || undefined,
          districtId: selectedResidenceDistrict || registrationForm.residence.districtId || undefined,
          communeId: selectedResidenceCommune || registrationForm.residence.communeId || undefined,
          villageId: selectedResidenceVillage || registrationForm.residence.villageId || undefined,
        },
        placeOfBirth: {
          provinceId: selectedBirthProvince || registrationForm.placeOfBirth.provinceId || undefined,
          districtId: selectedBirthDistrict || registrationForm.placeOfBirth.districtId || undefined,
          communeId: selectedBirthCommune || registrationForm.placeOfBirth.communeId || undefined,
          villageId: selectedBirthVillage || registrationForm.placeOfBirth.villageId || undefined,
        },
        // Parent information - array of parents
        parents: registrationForm.parents.map(parent => ({
          first_name: parent.firstName?.trim(),
          last_name: parent.lastName?.trim(),
          email: parent.email?.trim(),
          phone: parent.phone?.trim(),
          occupation: parent.occupation?.trim() || undefined,
          relationship: parent.relationship || 'FATHER',
          residence: {
            provinceId: parent.residence?.provinceId || undefined,
            districtId: parent.residence?.districtId || undefined,
            communeId: parent.residence?.communeId || undefined,
            villageId: parent.residence?.villageId || undefined,
          }
        }))
      };

      // Remove undefined/empty values
      Object.keys(studentData).forEach(k => {
        if (studentData[k] === undefined || studentData[k] === null || studentData[k] === '') delete studentData[k];
      });

      // Remove nested empty objects
      if (studentData.residence && Object.values(studentData.residence).every(v => !v)) {
        delete studentData.residence;
      }
      if (studentData.placeOfBirth && Object.values(studentData.placeOfBirth).every(v => !v)) {
        delete studentData.placeOfBirth;
      }

      const response = await studentService.register(studentData);

      if (response) {
        showSuccess('ការចុះឈ្មោះសិស្សបានជោគជ័យ!');
        resetForm();
        if (onSuccess) {
          onSuccess(response);
        }
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Error registering student:', error);
      showError('ការចុះឈ្មោះបានបរាជ័យ: ' + (error.message || 'មិនដឹងមូលហេតុ'));
    } finally {
      setLoading(false);
    }
  };

  const relationshipOptions = [
    { value: 'FATHER', label: 'ឪពុក' },
    { value: 'MOTHER', label: 'ម្ដាយ' },
    { value: 'GUARDIAN', label: 'អាណាព្យាបាល' },
    { value: 'OTHER', label: 'ផ្សេងៗ' }
  ];

  const accessibilityOptions = [
    { value: '', label: 'ជ្រើសរើសតម្រូវការប្រើប្រាស់' },
    { value: 'MOBILITY_DIFFICULTY', label: 'ពិបាកក្នុងការធ្វើចលនា' },
    { value: 'HEARING_DIFFICULTY', label: 'ពិបាកក្នុងការស្ដាប់' },
    { value: 'SPEECH_DIFFICULTY', label: 'ពិបាកក្នុងការនីយាយ' },
    { value: 'VISION_DIFFICULTY', label: 'ពិបាកក្នុងការមើល' },
    { value: 'INTERNAL_DISABILITY', label: 'ពិការសរីរាង្គខាងក្នុង' },
    { value: 'INTELLECTUAL_DISABILITY', label: 'ពិការសតិបញ្ញា' },
    { value: 'MENTAL_DISABILITY', label: 'ពិការផ្លូវចិត្ត' },
    { value: 'OTHER_DISABILITIES', label: 'ពិការផ្សេងៗ' }
  ];

  const ethnicGroupOptions = [
    { value: '', label: 'ជ្រើសរើសជនជាតិភាគតិច' },
    { value: 'ជនជាតិភ្នង', label: 'ជនជាតិភ្នង' },
    { value: 'ជនជាតិរអួង', label: 'ជនជាតិរអួង' },
    { value: 'ជនជាតិគួយ', label: 'ជនជាតិគួយ' },
    { value: 'ជនជាតិគ្រឹង', label: 'ជនជាតិគ្រឹង' },
    { value: 'ជនជាតិរដែរ', label: 'ជនជាតិរដែរ' },
    { value: 'ជនជាតិស្ទៀង', label: 'ជនជាតិស្ទៀង' },
    { value: 'ជនជាតិទំពួន', label: 'ជនជាតិទំពួន' },
    { value: 'ជនជាតិអានោង', label: 'ជនជាតិអានោង' },
    { value: 'ជនជាតិថ្មូន', label: 'ជនជាតិថ្មូន' },
    { value: 'ជនជាតិខា', label: 'ជនជាតិខា' },
    { value: 'ជនជាតិក្រោល', label: 'ជនជាតិក្រោល' },
    { value: 'ជនជាតិស្មិល', label: 'ជនជាតិស្មិល' },
    { value: 'ជនជាតិចារាយ', label: 'ជនជាតិចារាយ' },
    { value: 'ជនជាតិប្រ៊ូវ', label: 'ជនជាតិប្រ៊ូវ' },
    { value: 'ជនជាតិវៀតណាម', label: 'ជនជាតិវៀតណាម' },
    { value: 'ជនជាតិចាម', label: 'ជនជាតិចាម' },
    { value: 'ផ្សេងៗ', label: 'ផ្សេងៗ' }
    
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg mb-4">
            <User2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ការចុះឈ្មោះសិស្ស
          </h1>
          <p className="text-gray-600">
            បង្កើតគណនីសិស្សរបស់អ្នកដើម្បីចូលប្រើប្រព័ន្ធសិក្សា
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <span className="text-sm font-medium">1</span>
              </div>
              <div className={`flex-1 h-1 ${
                currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'
              }`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <span className="text-sm font-medium">2</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <span className="text-sm text-gray-600">
              {currentStep === 1 ? 'បំពេញព័ត៌មាន' : 'បញ្ជាក់ព័ត៌មាន'}
            </span>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {currentStep === 1 ? (
            <form onSubmit={(e) => { e.preventDefault(); goToNextStep(); }} className="p-8 space-y-8">

            {/* Personal Information */}
            <div className='border-t pt-6'>
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <User2 className="w-6 h-6 mr-3 text-blue-600" />
                ព័ត៌មានផ្ទាល់ខ្លួន
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    នាមខ្លួន *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="firstName"
                      value={registrationForm.firstName}
                      onChange={(e) => handleFormChange('firstName', e.target.value)}
                      className={`mt-1 block w-full pl-10 rounded-lg shadow-sm text-sm transition-all duration-300 border ${
                        formErrors.firstName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } hover:border-gray-400 focus:scale-[1.01] hover:shadow-md px-3 py-2`}
                      placeholder="បញ្ចូលនាមខ្លួន"
                      required
                    />
                  </div>
                  {formErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {formErrors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    នាមត្រកូល *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="lastName"
                      value={registrationForm.lastName}
                      onChange={(e) => handleFormChange('lastName', e.target.value)}
                      className={`mt-1 block w-full pl-10 rounded-lg shadow-sm text-sm transition-all duration-300 border ${
                        formErrors.lastName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } hover:border-gray-400 focus:scale-[1.01] hover:shadow-md px-3 py-2`}
                      placeholder="បញ្ចូលនាមត្រកូល"
                      required
                    />
                  </div>
                  {formErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {formErrors.lastName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ភេទ *
                  </label>
                  <Dropdown
                    options={[
                      { value: '', label: 'ជ្រើសរើសភេទ' },
                      { value: 'MALE', label: 'ប្រុស' },
                      { value: 'FEMALE', label: 'ស្រី' }
                    ]}
                    value={registrationForm.gender}
                    onValueChange={(value) => handleFormChange('gender', value)}
                    placeholder="ជ្រើសរើសភេទ"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={false}
                    className={formErrors.gender ? 'border-red-300' : ''}
                  />
                  {formErrors.gender && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {formErrors.gender}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ថ្ងៃខែឆ្នាំកំណើត *
                  </label>
                  <DatePickerWithDropdowns
                    value={registrationForm.dateOfBirth}
                    onChange={(date) => handleFormChange('dateOfBirth', date)}
                    placeholder="ជ្រើសរើសថ្ងៃខែឆ្នាំ"
                    className={formErrors.dateOfBirth ? 'border-red-300' : ''}
                  />
                  {formErrors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {formErrors.dateOfBirth}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Student Information */}
            <div className='border-t pt-6'>
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <User className="w-6 h-6 mr-3 text-green-600" />
                ព័ត៌មានសិស្ស
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="studentNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    លេខសិស្ស
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="studentNumber"
                      value={registrationForm.studentNumber}
                      onChange={(e) => handleFormChange('studentNumber', e.target.value)}
                      className={`mt-1 block w-full pl-10 rounded-lg shadow-sm text-sm transition-all duration-300 border ${
                        formErrors.studentNumber ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } hover:border-gray-400 focus:scale-[1.01] hover:shadow-md px-3 py-2`}
                      placeholder="បញ្ចូលលេខសិស្ស"
                    />
                  </div>
                  {formErrors.studentNumber && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {formErrors.studentNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    លេខទូរស័ព្ទ
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      value={registrationForm.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      className="mt-1 block w-full pl-10 rounded-lg shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md px-3 py-2"
                      placeholder="បញ្ចូលលេខទូរស័ព្ទ"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-2">
                    សញ្ជាតិ
                  </label>
                  <Dropdown
                    options={[
                      { value: '', label: 'ជ្រើសរើសសញ្ជាតិ' },
                      { value: 'ខ្មែរ', label: 'ខ្មែរ' }
                    ]}
                    value={registrationForm.nationality}
                    onValueChange={(value) => handleFormChange('nationality', value)}
                    placeholder="ជ្រើសរើសសញ្ជាតិ"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={false}
                  />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ជនជាតិភាគតិច
                    </label>
                    <Dropdown
                      options={ethnicGroupOptions}
                      value={registrationForm.minorityEthnicGroup}
                      onValueChange={(value) => handleFormChange('minorityEthnicGroup', value)}
                      placeholder="ជ្រើសរើសជនជាតិភាគតិច"
                      contentClassName="max-h-[200px] overflow-y-auto"
                      disabled={false}
                    />
                  </div>

              </div>

              {/* Accessibility Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  ព័ត៌មានអំពីភាពងាយស្រួលប្រើប្រាស់
                </h4>
                <div className="">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      តម្រូវការប្រើប្រាស់
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {accessibilityOptions.slice(1).map((option) => (
                        <div key={option.value} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`accessibility-${option.value}`}
                            checked={registrationForm.accessibility?.includes(option.value) || false}
                            onChange={(e) => handleCheckboxChange('accessibility', option.value, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`accessibility-${option.value}`} className="ml-2 block text-sm text-gray-700">
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  ព័ត៌មាននេះជួយយើងផ្តល់ការគាំទ្រ និងធនធានដែលសមរម្យ។
                </p>
              </div>
            </div>

            {/* Current Residence */}
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Building className="w-6 h-6 mr-3 text-purple-600" />
                អាសយដ្ឋានបច្ចុប្បន្ន
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ខេត្ត
                  </label>
                  <Dropdown
                    options={getResidenceProvinceOptions()}
                    value={selectedResidenceProvince}
                    onValueChange={handleResidenceProvinceChange}
                    placeholder="ជ្រើសរើសខេត្ត"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ស្រុក
                  </label>
                  <Dropdown
                    options={getResidenceDistrictOptions()}
                    value={selectedResidenceDistrict}
                    onValueChange={handleResidenceDistrictChange}
                    placeholder="ជ្រើសរើសស្រុក"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={!selectedResidenceProvince}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ឃុំ
                  </label>
                  <Dropdown
                    options={getResidenceCommuneOptions()}
                    value={selectedResidenceCommune}
                    onValueChange={handleResidenceCommuneChange}
                    placeholder="ជ្រើសរើសឃុំ"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={!selectedResidenceDistrict}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ភូមិ
                  </label>
                  <Dropdown
                    options={getResidenceVillageOptions()}
                    value={selectedResidenceVillage}
                    onValueChange={handleResidenceVillageChange}
                    placeholder="ជ្រើសរើសភូមិ"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={!selectedResidenceCommune}
                  />
                </div>
              </div>
            </div>

            {/* Place of Birth */}
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Building className="w-6 h-6 mr-3 text-orange-600" />
                ទីកន្លែងកំណើត
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ខេត្ត
                  </label>
                  <Dropdown
                    options={getBirthProvinceOptions()}
                    value={selectedBirthProvince}
                    onValueChange={handleBirthProvinceChange}
                    placeholder="ជ្រើសរើសខេត្ត"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ស្រុក
                  </label>
                  <Dropdown
                    options={getBirthDistrictOptions()}
                    value={selectedBirthDistrict}
                    onValueChange={handleBirthDistrictChange}
                    placeholder="ជ្រើសរើសស្រុក"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={!selectedBirthProvince}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ឃុំ
                  </label>
                  <Dropdown
                    options={getBirthCommuneOptions()}
                    value={selectedBirthCommune}
                    onValueChange={handleBirthCommuneChange}
                    placeholder="ជ្រើសរើសឃុំ"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={!selectedBirthDistrict}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ភូមិ
                  </label>
                  <Dropdown
                    options={getBirthVillageOptions()}
                    value={selectedBirthVillage}
                    onValueChange={handleBirthVillageChange}
                    placeholder="ជ្រើសរើសភូមិ"
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={!selectedBirthCommune}
                  />
                </div>
              </div>
            </div>

            {/* Parent Information */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <User className="w-6 h-6 mr-3 text-green-600" />
                  ព័ត៌មានអាណាព្យាបាល
                </h3>
                <Button
                  type="button"
                  onClick={addParent}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  បន្ថែមអាណាព្យាបាល
                </Button>
              </div>

              {registrationForm.parents.map((parent, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      អាណាព្យាបាល {index + 1}
                    </h4>
                    {registrationForm.parents.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeParent(index)}
                        variant="danger"
                        size="sm"
                        className="flex items-center"
                      >
                        <X className="h-4 w-4 mr-1" />
                        លុបចេញ
                      </Button>
                    )}
                  </div>

                  {/* Parent Basic Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-6">
                    <div>
                      <label htmlFor={`parent${index}FirstName`} className="block text-sm font-medium text-gray-700 mb-2">
                        នាមខ្លួន *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          id={`parent${index}FirstName`}
                          value={parent.firstName}
                          onChange={(e) => handleFormChange('parent', { firstName: e.target.value }, index)}
                          className={`mt-1 block w-full pl-10 rounded-lg shadow-sm text-sm transition-all duration-300 border ${
                            formErrors[`parent${index}FirstName`] ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          } hover:border-gray-400 focus:scale-[1.01] hover:shadow-md px-3 py-2`}
                          placeholder="បញ្ចូលនាមខ្លួន"
                          required
                        />
                      </div>
                      {formErrors[`parent${index}FirstName`] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <XCircle className="h-4 w-4 mr-1" />
                          {formErrors[`parent${index}FirstName`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`parent${index}LastName`} className="block text-sm font-medium text-gray-700 mb-2">
                        នាមត្រកូល *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          id={`parent${index}LastName`}
                          value={parent.lastName}
                          onChange={(e) => handleFormChange('parent', { lastName: e.target.value }, index)}
                          className={`mt-1 block w-full pl-10 rounded-lg shadow-sm text-sm transition-all duration-300 border ${
                            formErrors[`parent${index}LastName`] ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          } hover:border-gray-400 focus:scale-[1.01] hover:shadow-md px-3 py-2`}
                          placeholder="បញ្ចូលនាមត្រកូល"
                          required
                        />
                      </div>
                      {formErrors[`parent${index}LastName`] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <XCircle className="h-4 w-4 mr-1" />
                          {formErrors[`parent${index}LastName`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`parent${index}Phone`} className="block text-sm font-medium text-gray-700 mb-2">
                        លេខទូរស័ព្ទ *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          id={`parent${index}Phone`}
                          value={parent.phone}
                          onChange={(e) => handleFormChange('parent', { phone: e.target.value }, index)}
                          className={`mt-1 block w-full pl-10 rounded-lg shadow-sm text-sm transition-all duration-300 border ${
                            formErrors[`parent${index}Phone`] ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          } hover:border-gray-400 focus:scale-[1.01] hover:shadow-md px-3 py-2`}
                          placeholder="បញ្ចូលលេខទូរស័ព្ទ"
                          required
                        />
                      </div>
                      {formErrors[`parent${index}Phone`] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <XCircle className="h-4 w-4 mr-1" />
                          {formErrors[`parent${index}Phone`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ទំនាក់ទំនង
                      </label>
                      <Dropdown
                        options={[
                          { value: 'FATHER', label: 'ឪពុក' },
                          { value: 'MOTHER', label: 'ម្ដាយ' },
                          { value: 'GUARDIAN', label: 'អាណាព្យាបាល' },
                          { value: 'OTHER', label: 'ផ្សេងៗ' }
                        ]}
                        value={parent.relationship}
                        onValueChange={(value) => handleFormChange('parent', { relationship: value }, index)}
                        placeholder="ជ្រើសរើសទំនាក់ទំនង"
                        contentClassName="max-h-[200px] overflow-y-auto"
                        disabled={false}
                      />
                    </div>
                  </div>

                  {/* Parent Additional Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor={`parent${index}Occupation`} className="block text-sm font-medium text-gray-700 mb-2">
                        មុខរបរ
                      </label>
                      <input
                        type="text"
                        id={`parent${index}Occupation`}
                        value={parent.occupation}
                        onChange={(e) => handleFormChange('parent', { occupation: e.target.value }, index)}
                        className="mt-1 block w-full rounded-lg shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md px-3 py-2"
                        placeholder="បញ្ចូលមុខរបរ"
                      />
                    </div>
                  </div>

                  {/* Parent Residence */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Building className="w-5 h-5 mr-2 text-purple-600" />
                      អាសយដ្ឋានអាណាព្យាបាល
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ខេត្ត
                        </label>
                        <Dropdown
                          options={getResidenceProvinceOptions()}
                          value={parent.residence?.provinceId || ''}
                          onValueChange={(value) => handleFormChange('parent', {
                            residence: { ...parent.residence, provinceId: value }
                          }, index)}
                          placeholder="ជ្រើសរើសខេត្ត"
                          contentClassName="max-h-[200px] overflow-y-auto"
                          disabled={false}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ស្រុក
                        </label>
                        <Dropdown
                          options={getResidenceDistrictOptions()}
                          value={parent.residence?.districtId || ''}
                          onValueChange={(value) => handleFormChange('parent', {
                            residence: { ...parent.residence, districtId: value }
                          }, index)}
                          placeholder="ជ្រើសរើសស្រុក"
                          contentClassName="max-h-[200px] overflow-y-auto"
                          disabled={!parent.residence?.provinceId}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ឃុំ
                        </label>
                        <Dropdown
                          options={getResidenceCommuneOptions()}
                          value={parent.residence?.communeId || ''}
                          onValueChange={(value) => handleFormChange('parent', {
                            residence: { ...parent.residence, communeId: value }
                          }, index)}
                          placeholder="ជ្រើសរើសឃុំ"
                          contentClassName="max-h-[200px] overflow-y-auto"
                          disabled={!parent.residence?.districtId}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ភូមិ
                        </label>
                        <Dropdown
                          options={getResidenceVillageOptions()}
                          value={parent.residence?.villageId || ''}
                          onValueChange={(value) => handleFormChange('parent', {
                            residence: { ...parent.residence, villageId: value }
                          }, index)}
                          placeholder="ជ្រើសរើសភូមិ"
                          contentClassName="max-h-[200px] overflow-y-auto"
                          disabled={!parent.residence?.communeId}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-6 pt-8 border-t">
              {onCancel && (
                <Button
                  type="button"
                  onClick={onCancel}
                  variant="outline"
                  disabled={loading}
                  className="px-8 py-3"
                >
                  បោះបង់
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !isFormValid}
                className="px-8 py-3 min-w-[200px] shadow-lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                បន្តទៅការបញ្ជាក់
              </Button>
            </div>
          </form>
          ) : (
            /* Confirmation Step */
            <div className="p-8 space-y-8">
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  បញ្ជាក់ព័ត៌មាន
                </h2>
                <p className="text-gray-600">
                  សូមពិនិត្យមើលព័ត៌មានរបស់អ្នកមុននឹងចុះឈ្មោះ
                </p>
              </div>

              {/* Student Information Summary */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ព័ត៌មានសិស្ស</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">នាមខ្លួន:</span>
                    <p className="text-sm text-gray-900">{registrationForm.firstName} {registrationForm.lastName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">លេខសិស្ស:</span>
                    <p className="text-sm text-gray-900">{registrationForm.studentNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">ភេទ:</span>
                    <p className="text-sm text-gray-900">
                      {registrationForm.gender === 'MALE' ? 'ប្រុស' : registrationForm.gender === 'FEMALE' ? 'ស្រី' : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">ថ្ងៃខែឆ្នាំកំណើត:</span>
                    <p className="text-sm text-gray-900">
                      {registrationForm.dateOfBirth ? new Date(registrationForm.dateOfBirth).toLocaleDateString('km-KH') : ''}
                    </p>
                  </div>
                  {registrationForm.phone && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">លេខទូរស័ព្ទ:</span>
                      <p className="text-sm text-gray-900">{registrationForm.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parent Information Summary */}
              {registrationForm.parents.map((parent, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">អាណាព្យាបាល {index + 1}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">នាមខ្លួន:</span>
                      <p className="text-sm text-gray-900">{parent.firstName} {parent.lastName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">អ៊ីមែល:</span>
                      <p className="text-sm text-gray-900">{parent.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">លេខទូរស័ព្ទ:</span>
                      <p className="text-sm text-gray-900">{parent.phone}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">ទំនាក់ទំនង:</span>
                      <p className="text-sm text-gray-900">
                        {parent.relationship === 'FATHER' ? 'ឪពុក' :
                         parent.relationship === 'MOTHER' ? 'ម្ដាយ' :
                         parent.relationship === 'GUARDIAN' ? 'អាណាព្យាបាល' : 'ផ្សេងៗ'}
                      </p>
                    </div>
                    {parent.occupation && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">មុខរបរ:</span>
                        <p className="text-sm text-gray-900">{parent.occupation}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              <div className="flex items-center justify-center space-x-6 pt-8 border-t">
                <Button
                  type="button"
                  onClick={goToPreviousStep}
                  variant="outline"
                  disabled={loading}
                  className="px-8 py-3"
                >
                  ត្រឡប់ក្រោយ
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  variant="primary"
                  disabled={loading}
                  className="px-8 py-3 min-w-[200px] shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      កំពុងចុះឈ្មោះ...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      បញ្ជាក់ និងចុះឈ្មោះ
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentRegistrationForm;