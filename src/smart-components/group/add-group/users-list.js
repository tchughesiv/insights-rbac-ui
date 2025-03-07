import React, { useEffect, Fragment, useState, useContext, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import truncate from 'lodash/truncate';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { TableToolbarView } from '../../../presentational-components/shared/table-toolbar-view';
import AppLink, { mergeToBasename } from '../../../presentational-components/shared/AppLink';
import { fetchUsers, updateUsersFilters, updateUsers, updateUserIsOrgAdminStatus } from '../../../redux/actions/user-actions';
import { Button, Switch as PF4Switch, Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';
import { sortable, nowrap } from '@patternfly/react-table';
import { mappedProps } from '../../../helpers/shared/helpers';
import UsersRow from '../../../presentational-components/shared/UsersRow';
import {
  defaultSettings,
  defaultAdminSettings,
  syncDefaultPaginationWithUrl,
  applyPaginationToUrl,
  isPaginationPresentInUrl,
} from '../../../helpers/shared/pagination';
import { syncDefaultFiltersWithUrl, applyFiltersToUrl, areFiltersPresentInUrl } from '../../../helpers/shared/filters';
import messages from '../../../Messages';
import PermissionsContext from '../../../utilities/permissions-context';
import { useScreenSize, isSmallScreen } from '@redhat-cloud-services/frontend-components/useScreenSize';
import paths from '../../../utilities/pathnames';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';

const IsAdminCellDropdownContent = ({ isOrgAdmin, userId, isDisabled, toggleUserIsOrgAdminStatus }) => {
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const intl = useIntl();

  const onIsAdminDropdownToggle = (isOpen) => {
    setIsAdminDropdownOpen(isOpen);
  };

  const onIsAdminDropdownSelect = (_event) => {
    const isAdminStatusMap = { yes: true, no: false };

    toggleUserIsOrgAdminStatus(isAdminStatusMap[_event?.target?.id], null, { userId });
    setIsAdminDropdownOpen(false);
  };

  const dropdownItems = [
    <DropdownItem key={`is-admin-dropdown-item-${userId}`} componentID="yes">
      {intl.formatMessage(messages.yes)}
    </DropdownItem>,
    <DropdownItem key={`is-not-admin-dropdown-item-${userId}`} componentID="no">
      {intl.formatMessage(messages.no)}
    </DropdownItem>,
  ];
  return (
    <Dropdown
      id={`is-admin-dropdown-${userId}`}
      key={`is-admin-dropdown-${userId}`}
      onSelect={onIsAdminDropdownSelect}
      toggle={
        <DropdownToggle
          id={`is-admin-dropdown-toggle-${userId}`}
          key={`is-admin-dropdown-toggle-${userId}`}
          isDisabled={isDisabled}
          onToggle={onIsAdminDropdownToggle}
        >
          {isOrgAdmin ? intl.formatMessage(messages.yes) : intl.formatMessage(messages.no)}
        </DropdownToggle>
      }
      isOpen={isAdminDropdownOpen}
      dropdownItems={dropdownItems}
    />
  );
};

const UsersList = ({ selectedUsers, setSelectedUsers, userLinks, usesMetaInURL, displayNarrow, props }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [selectedRows, setSelectedRows] = useState(selectedUsers);
  const [isToolbarDropdownOpen, setIsToolbarDropdownOpen] = useState(false);
  const { orgAdmin, userAccessAdministrator } = useContext(PermissionsContext);
  const screenSize = useScreenSize();
  // use for text filter to focus
  const innerRef = useRef(null);
  const isAdmin = orgAdmin || userAccessAdministrator;
  const chrome = useChrome();
  const [currentUser, setCurrentUser] = useState({});

  // for usesMetaInURL (Users page) store pagination settings in Redux, otherwise use results from meta
  let pagination = useSelector(({ userReducer: { users } }) => ({
    limit: (usesMetaInURL ? users.pagination.limit : users.meta.limit) ?? (orgAdmin ? defaultAdminSettings : defaultSettings).limit,
    offset: (usesMetaInURL ? users.pagination.offset : users.meta.offset) ?? (orgAdmin ? defaultAdminSettings : defaultSettings).offset,
    count: usesMetaInURL ? users.pagination.count : users.meta.count,
    redirected: usesMetaInURL && users.pagination.redirected,
  }));

  const { users, isLoading, stateFilters } = useSelector(
    ({
      userReducer: {
        users: { data, filters = {} },
        isUserDataLoading,
      },
    }) => ({
      users: data?.map?.((data) => ({ ...data, uuid: data.external_source_id })),
      isLoading: isUserDataLoading,
      stateFilters: location.search.length > 0 || Object.keys(filters).length > 0 ? filters : { status: ['Active'] },
    })
  );

  const fetchData = useCallback(
    (apiProps) => {
      return dispatch(fetchUsers(apiProps));
    },
    [dispatch]
  );

  const toggleUserIsOrgAdminStatus = (isOrgAdmin, _event, user = {}) => {
    const { limit, offset } = syncDefaultPaginationWithUrl(location, navigate, pagination);
    const newFilters = usesMetaInURL
      ? syncDefaultFiltersWithUrl(location, navigate, ['username', 'email', 'status'], filters)
      : { status: filters.status };
    const newUserObj = { id: user.userId, is_org_admin: isOrgAdmin };
    dispatch(updateUserIsOrgAdminStatus(newUserObj))
      .then((res) => {
        setFilters(newFilters);
        if (props.setSelectedUsers) {
          setSelectedUsers([]);
        } else {
          setSelectedRows([]);
        }
        fetchData({ ...mappedProps({ limit, offset, filters: newFilters }), usesMetaInURL });
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const toolbarDropdowns = () => {
    const onToggle = (isOpen) => {
      setIsToolbarDropdownOpen(isOpen);
    };
    const onToolbarDropdownSelect = async (_event) => {
      const userActivationStatusMap = { activate: true, deactivate: false };

      toggleUserActivationStatus(userActivationStatusMap[_event?.target?.id], null, selectedRows);
      setIsToolbarDropdownOpen(false);
    };
    const dropdownItems = [
      <DropdownItem key="activate-users-dropdown-item" componentID="activate">
        {intl.formatMessage(messages.activateUsersButton)}
      </DropdownItem>,
      <DropdownItem key="deactivate-users-dropdown-item" componentID="deactivate">
        {intl.formatMessage(messages.deactivateUsersButton)}
      </DropdownItem>,
    ];
    return (
      <Dropdown
        onSelect={onToolbarDropdownSelect}
        toggle={
          <DropdownToggle id="toolbar-dropdown-toggle" isDisabled={selectedRows.length === 0} onToggle={onToggle}>
            {intl.formatMessage(messages.activateUsersButton)}
          </DropdownToggle>
        }
        isOpen={isToolbarDropdownOpen}
        dropdownItems={dropdownItems}
      />
    );
  };

  const toolbarButtons = () =>
    isAdmin
      ? [
          <AppLink to={paths['invite-users'].link} key="invite-users" className="rbac-m-hide-on-sm">
            <Button ouiaId="invite-users-button" variant="primary" aria-label="Invite users">
              {intl.formatMessage(messages.inviteUsers)}
            </Button>
          </AppLink>,
          ...(isSmallScreen(screenSize)
            ? [
                {
                  label: intl.formatMessage(messages.inviteUsers),
                  onClick: () => {
                    navigate(mergeToBasename(paths['invite-users'].link));
                  },
                },
              ]
            : []),
        ]
      : [];

  const toggleUserActivationStatus = (isActivated, _event, users = []) => {
    const { limit, offset } = syncDefaultPaginationWithUrl(location, navigate, pagination);
    const newFilters = usesMetaInURL
      ? syncDefaultFiltersWithUrl(location, navigate, ['username', 'email', 'status'], filters)
      : { status: filters.status };
    const newUserList = users.map((user) => {
      return { id: user?.uuid || user?.external_source_id, is_active: isActivated };
    });
    dispatch(updateUsers(newUserList))
      .then((res) => {
        setFilters(newFilters);
        if (props?.setSelectedUsers) {
          setSelectedUsers([]);
        } else {
          setSelectedRows([]);
        }
        fetchData({ ...mappedProps({ limit, offset, filters: newFilters }), usesMetaInURL });
      })
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    chrome.auth.getUser().then((user) => setCurrentUser(user));
  }, []);

  const createRows = (userLinks, data, checkedRows = []) => {
    const maxLength = 25;
    return data
      ? data.reduce(
          (
            acc,
            { external_source_id, username, is_active: is_active, email, first_name: firstName, last_name: lastName, is_org_admin: isOrgAdmin }
          ) => [
            ...acc,
            {
              uuid: external_source_id,
              cells: [
                {
                  title: (
                    <IsAdminCellDropdownContent
                      isOrgAdmin={isOrgAdmin}
                      userId={external_source_id}
                      isDisabled={!isAdmin || currentUser?.identity?.internal?.account_id == external_source_id}
                      toggleUserIsOrgAdminStatus={toggleUserIsOrgAdminStatus}
                    />
                  ),
                  props: {
                    'data-is-active': isOrgAdmin,
                  },
                },
                {
                  title: userLinks ? (
                    <AppLink to={paths['user-detail'].link.replace(':username', username)}>{username.toString()}</AppLink>
                  ) : displayNarrow ? (
                    <span title={username}>{truncate(username, { length: maxLength })}</span>
                  ) : (
                    username
                  ),
                },
                {
                  title: displayNarrow ? <span title={email}>{truncate(email, { length: maxLength })}</span> : email,
                },
                firstName,
                lastName,
                {
                  title: (
                    <PF4Switch
                      key="status"
                      isDisabled={!isAdmin || currentUser?.identity?.internal?.account_id == external_source_id}
                      label={intl.formatMessage(messages.active)}
                      labelOff={intl.formatMessage(messages.inactive)}
                      isChecked={is_active}
                      onChange={(checked, _event) => {
                        toggleUserActivationStatus(checked, _event, [
                          {
                            external_source_id,
                            is_active: is_active,
                          },
                        ]);
                      }}
                    />
                  ),
                  props: {
                    'data-is-active': is_active,
                  },
                },
              ],
              selected: Boolean(checkedRows?.find?.(({ uuid }) => uuid === external_source_id)),
            },
          ],
          []
        )
      : [];
  };

  const rows = createRows(userLinks, users, selectedRows);
  const updateStateFilters = useCallback((filters) => dispatch(updateUsersFilters(filters)), [dispatch]);
  const columns = [
    { title: intl.formatMessage(displayNarrow ? messages.orgAdmin : messages.orgAdministrator), key: 'org-admin', transforms: [nowrap] },
    { title: intl.formatMessage(messages.username), key: 'username', transforms: [sortable] },
    { title: intl.formatMessage(messages.email) },
    { title: intl.formatMessage(messages.firstName), transforms: [nowrap] },
    { title: intl.formatMessage(messages.lastName), transforms: [nowrap] },
    { title: intl.formatMessage(messages.status), transforms: [nowrap] },
  ];
  const [sortByState, setSortByState] = useState({ index: 1, direction: 'asc' });

  const [filters, setFilters] = useState(
    usesMetaInURL
      ? stateFilters
      : {
          username: '',
          email: '',
          status: [intl.formatMessage(messages.active)],
        }
  );

  useEffect(() => {
    usesMetaInURL && applyPaginationToUrl(location, navigate, pagination.limit, pagination.offset);
  }, [pagination.offset, pagination.limit, pagination.count, pagination.redirected]);

  useEffect(() => {
    const { limit, offset } = syncDefaultPaginationWithUrl(location, navigate, pagination);
    const newFilters = usesMetaInURL
      ? syncDefaultFiltersWithUrl(location, navigate, ['username', 'email', 'status'], filters)
      : { status: filters.status };
    setFilters(newFilters);
    fetchData({ ...mappedProps({ limit, offset, filters: newFilters }), usesMetaInURL });
  }, []);

  useEffect(() => {
    if (usesMetaInURL) {
      isPaginationPresentInUrl(location) || applyPaginationToUrl(location, navigate, pagination.limit, pagination.offset);
      Object.values(filters).some((filter) => filter?.length > 0) &&
        !areFiltersPresentInUrl(location, Object.keys(filters)) &&
        syncDefaultFiltersWithUrl(location, navigate, Object.keys(filters), filters);
    }
  });

  const setCheckedItems = (newSelection) => {
    if (props?.setSelectedUsers) {
      setSelectedUsers((users) => {
        return newSelection(users).map(({ uuid, username }) => ({ uuid, label: username || uuid }));
      });
    } else {
      setSelectedRows((users) => {
        return newSelection(users).map(({ uuid, username }) => ({ uuid, label: username || uuid }));
      });
    }
  };

  const updateFilters = (payload) => {
    usesMetaInURL && updateStateFilters(payload);
    setFilters({ username: '', ...payload });
  };

  return (
    <TableToolbarView
      toolbarChildren={isAdmin ? toolbarDropdowns : () => null}
      toolbarButtons={toolbarButtons}
      isCompact
      isSelectable
      borders={false}
      columns={columns}
      rows={rows}
      sortBy={sortByState}
      onSort={(e, index, direction) => {
        const orderBy = `${direction === 'desc' ? '-' : ''}${columns[index].key}`;
        setSortByState({ index, direction });
        fetchData({ ...pagination, filters, usesMetaInURL, orderBy });
      }}
      data={users}
      ouiaId="users-table"
      fetchData={(config) => {
        const status = Object.prototype.hasOwnProperty.call(config, 'status') ? config.status : filters.status;
        const { username, email, count, limit, offset, orderBy } = config;

        fetchData({ ...mappedProps({ count, limit, offset, orderBy, filters: { username, email, status } }), usesMetaInURL }).then(() => {
          innerRef?.current?.focus();
        });
        usesMetaInURL && applyFiltersToUrl(location, navigate, { username, email, status });
      }}
      emptyFilters={{ username: '', email: '', status: '' }}
      setFilterValue={({ username, email, status }) => {
        updateFilters({
          username: typeof username === 'undefined' ? filters.username : username,
          email: typeof email === 'undefined' ? filters.email : email,
          status: typeof status === 'undefined' || status === filters.status ? filters.status : status,
        });
      }}
      isLoading={isLoading}
      pagination={pagination}
      checkedRows={selectedRows}
      setCheckedItems={setCheckedItems}
      rowWrapper={UsersRow}
      titlePlural={intl.formatMessage(messages.users).toLowerCase()}
      titleSingular={intl.formatMessage(messages.user)}
      filters={[
        {
          key: 'username',
          value: filters.username,
          placeholder: intl.formatMessage(messages.filterByKey, { key: intl.formatMessage(messages.username).toLowerCase() }),
          innerRef,
        },
        {
          key: 'email',
          value: filters.email,
          placeholder: intl.formatMessage(messages.filterByKey, { key: intl.formatMessage(messages.email).toLowerCase() }),
          innerRef,
        },
        {
          key: 'status',
          value: filters.status,
          label: intl.formatMessage(messages.status),
          type: 'checkbox',
          items: [
            { label: intl.formatMessage(messages.active), value: 'Active' },
            { label: intl.formatMessage(messages.inactive), value: 'Inactive' },
          ],
        },
      ]}
      tableId="users-list"
      {...props}
    />
  );
};

UsersList.propTypes = {
  displayNarrow: PropTypes.bool,
  users: PropTypes.array,
  searchFilter: PropTypes.string,
  setSelectedUsers: PropTypes.func.isRequired,
  selectedUsers: PropTypes.array,
  userLinks: PropTypes.bool,
  props: PropTypes.object,
  usesMetaInURL: PropTypes.bool,
};

UsersList.defaultProps = {
  displayNarrow: false,
  users: [],
  selectedUsers: [],
  setSelectedUsers: () => undefined,
  userLinks: false,
  usesMetaInURL: false,
};

export default UsersList;
