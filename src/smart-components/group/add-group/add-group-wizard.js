import React, { useState, createContext, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { addNotification } from '@redhat-cloud-services/frontend-components-notifications/';
import FormRenderer from '@data-driven-forms/react-form-renderer/form-renderer';
import Pf4FormTemplate from '@data-driven-forms/pf4-component-mapper/form-template';
import componentMapper from '@data-driven-forms/pf4-component-mapper/component-mapper';
import { useIntl } from 'react-intl';
import { WarningModal } from '../../common/warningModal';
import { schemaBuilder } from './schema';
import { addGroup } from '../../../redux/actions/group-actions';
import useAppNavigate from '../../../hooks/useAppNavigate';
import SetName from './set-name';
import SetRoles from './set-roles';
import SetUsers from './set-users';
import SummaryContent from './summary-content';
import { createQueryParams } from '../../../helpers/shared/helpers';
import paths from '../../../utilities/pathnames';
import messages from '../../../Messages';

export const AddGroupWizardContext = createContext({
  success: false,
  submitting: false,
  error: undefined,
});

const FormTemplate = (props) => <Pf4FormTemplate {...props} showFormControls={false} />;

const Description = ({ Content, ...rest }) => <Content {...rest} />;
Description.propTypes = {
  Content: PropTypes.elementType.isRequired,
};

export const mapperExtension = {
  description: Description,
  'set-name': SetName,
  'set-roles': SetRoles,
  'set-users': SetUsers,
  'summary-content': SummaryContent,
};

export const onCancel = (emptyCallback, nonEmptyCallback, setGroupData) => (formData) => {
  setGroupData(formData);
  if (Object.keys(formData).length > 0) {
    nonEmptyCallback(true);
  } else {
    emptyCallback();
  }
};

const AddGroupWizard = ({ postMethod, pagination, filters, orderBy }) => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const schema = useRef(schemaBuilder());
  const navigate = useAppNavigate();
  const [cancelWarningVisible, setCancelWarningVisible] = useState(false);
  const [groupData, setGroupData] = useState({});
  const [wizardContextValue, setWizardContextValue] = useState({
    success: false,
    submitting: false,
    error: undefined,
    hideForm: false,
  });

  const redirectToGroups = () => {
    dispatch(
      addNotification({
        variant: 'warning',
        title: intl.formatMessage(messages.addingGroupTitle),
        dismissDelay: 8000,
        description: intl.formatMessage(messages.addingGroupCanceledDescription),
      })
    );
    navigate({
      pathname: paths.groups.link,
      search: createQueryParams({ page: 1, per_page: pagination.limit, ...filters }),
    });
  };

  const setWizardError = (error) => setWizardContextValue((prev) => ({ ...prev, error }));
  const setWizardSuccess = (success) => setWizardContextValue((prev) => ({ ...prev, success }));
  const setHideForm = (hideForm) => setWizardContextValue((prev) => ({ ...prev, hideForm }));

  const onSubmit = (formData) => {
    const groupData = {
      name: formData['group-name'],
      description: formData['group-description'],
      user_list: formData['users-list'].map((user) => ({ username: user.label })),
      roles_list: formData['roles-list'].map((role) => role.uuid),
    };
    navigate({
      pathname: paths.groups.link,
      search: createQueryParams({ page: 1, per_page: pagination.limit }),
    });
    dispatch(addGroup(groupData))
      .then(() => postMethod({ limit: pagination.limit, offset: 0, orderBy, filters: {} }))
      .then(() => {
        dispatch(
          addNotification({
            variant: 'success',
            title: intl.formatMessage(messages.addGroupSuccessTitle),
            dismissDelay: 8000,
            description: intl.formatMessage(messages.addGroupSuccessDescription),
          })
        );
      });
  };

  return cancelWarningVisible ? (
    <WarningModal
      type="group"
      isOpen={cancelWarningVisible}
      onModalCancel={() => setCancelWarningVisible(false)}
      onConfirmCancel={redirectToGroups}
    />
  ) : (
    <AddGroupWizardContext.Provider value={{ ...wizardContextValue, setWizardError, setWizardSuccess, setHideForm }}>
      <FormRenderer
        schema={schema.current}
        subscription={{ values: true }}
        FormTemplate={FormTemplate}
        componentMapper={{ ...componentMapper, ...mapperExtension }}
        onSubmit={onSubmit}
        initialValues={groupData}
        onCancel={onCancel(redirectToGroups, setCancelWarningVisible, setGroupData)}
      />
    </AddGroupWizardContext.Provider>
  );
};

AddGroupWizard.propTypes = {
  postMethod: PropTypes.func,
  pagination: PropTypes.shape({
    limit: PropTypes.number.isRequired,
  }).isRequired,
  filters: PropTypes.object.isRequired,
  orderBy: PropTypes.string,
};

export default AddGroupWizard;
