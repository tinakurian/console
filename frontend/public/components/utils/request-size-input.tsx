import * as React from 'react';
import { Dropdown } from './dropdown';
import * as classNames from 'classnames';
import { useTranslation } from 'react-i18next';

export const RequestSizeInput: React.FC<RequestSizeInputProps> = ({
  children,
  defaultRequestSizeUnit,
  defaultRequestSizeValue,
  describedBy,
  dropdownUnits,
  inputClassName,
  inputID,
  isInputDisabled,
  minValue,
  name,
  onChange,
  placeholder,
  required,
  step,
  testID,
}) => {
  const [unit, setUnit] = React.useState(defaultRequestSizeUnit);
  const [value, setValue] = React.useState(defaultRequestSizeValue);

  const onValueChange: React.ReactEventHandler<HTMLInputElement> = (event) => {
    setValue(event.currentTarget.value);
    onChange({ value: event.currentTarget.value, unit });
  };

  const onUnitChange = (newUnit) => {
    setUnit(newUnit);
    onChange({ value, unit: newUnit });
  };

  const { t } = useTranslation();
  const inputName = `${name}Value`;
  const dropdownName = `${name}Unit`;
  return (
    <div>
      <div className="pf-c-input-group">
        <input
          className={classNames('pf-c-form-control', inputClassName)}
          type="number"
          step={step || 'any'}
          onChange={onValueChange}
          placeholder={placeholder}
          aria-describedby={describedBy}
          name={inputName}
          id={inputID}
          data-test={testID}
          required={required}
          value={defaultRequestSizeValue}
          min={minValue}
          disabled={isInputDisabled}
        />
        <Dropdown
          title={dropdownUnits[defaultRequestSizeUnit]}
          selectedKey={defaultRequestSizeUnit}
          name={dropdownName}
          className="btn-group"
          items={dropdownUnits}
          onChange={onUnitChange}
          disabled={isInputDisabled}
          required={required}
          ariaLabel={t('public~Number of {{sizeUnit}}', {
            sizeUnit: dropdownUnits[unit],
          })}
        />
      </div>
      {children}
    </div>
  );
};

export type RequestSizeInputProps = {
  placeholder?: string;
  name: string;
  onChange: Function;
  required?: boolean;
  dropdownUnits: any;
  defaultRequestSizeUnit: string;
  defaultRequestSizeValue: string;
  describedBy?: string;
  step?: number;
  minValue?: number;
  inputClassName?: string;
  inputID?: string;
  testID?: string;
  isInputDisabled?: boolean;
};
