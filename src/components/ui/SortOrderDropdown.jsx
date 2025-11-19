import React from 'react';
import Dropdown from './Dropdown';
import { useLanguage } from '../../contexts/LanguageContext';

const SortOrderDropdown = ({ value, onChange, className = "" }) => {
  const { t } = useLanguage();

  const options = [
    { value: 'ASC', label: t('ascending', 'Ascending') },
    { value: 'DESC', label: t('descending', 'Descending') }
  ];

  return (
    <Dropdown
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={t('selectSortOrder', 'Select Sort Order')}
      className={className}
    />
  );
};

export default SortOrderDropdown;