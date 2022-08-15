import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import PropTypes from 'prop-types';
import { sortable } from '@patternfly/react-table';
import { mappedProps } from '../../../helpers/shared/helpers';
import { TableToolbarViewForRoles } from '../../../presentational-components/shared/table-toolbar-view';
import { fetchRolesWithPolicies } from '../../../redux/actions/role-actions';
import { fetchAddRolesForGroup } from '../../../redux/actions/group-actions';
import { useIntl } from 'react-intl';
import messages from '../../../Messages';

const createRows = (data, checkedRows = []) => {
  return data
    ? data.reduce(
        (acc, { uuid, display_name, name, description }) => [
          ...acc,
          {
            uuid,
            cells: [display_name || name, description],
            selected: Boolean(checkedRows && checkedRows.find((row) => row.uuid === uuid)),
          },
        ],
        []
      )
    : [];
};

export const RolesList = ({ selectedRoles, setSelectedRoles, rolesExcluded }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const selector = ({ roleReducer: { roles, isLoading }, groupReducer: { selectedGroup } }) => ({
    roles: rolesExcluded ? selectedGroup.addRoles.roles : roles.data,
    pagination: rolesExcluded ? selectedGroup.addRoles.pagination || { ...defaultSettings, count: roles && roles.length } : roles.meta,
    isLoading: rolesExcluded ? !selectedGroup.addRoles.loaded : isLoading,
    filters: roles.filters,
    groupId: selectedGroup.uuid,
  });
  const { current: columns } = useRef([
    { title: intl.formatMessage(messages.name), key: 'display_name', ...(!rolesExcluded ? { transforms: [sortable] } : { orderBy: 'name' }) },
    { title: intl.formatMessage(messages.description) },
  ]);
  const { roles, pagination, isLoading, groupId, filters } = useSelector(selector, shallowEqual);
  const fetchRoles = (config) => dispatch(fetchRolesWithPolicies(mappedProps(config)));
  const fetchRolesForGroup = (groupId, config) => dispatch(fetchAddRolesForGroup(groupId, config));
  const [filterValue, setFilterValue] = useState('');

  const setCheckedItems = (newSelection) => {
    setSelectedRoles((roles) => {
      return newSelection(roles).map(({ uuid, name, label }) => ({ uuid, label: label || name }));
    });
  };

  const fetchTableData = (config) => {
    const { name, count, limit, offset, orderBy } = config;
    return fetchRoles(mappedProps({ count, limit, offset, orderBy, filters: { display_name: name } }));
  };
  const [sortByState, setSortByState] = useState({ index: 1, direction: 'asc' });
  const orderBy = `${sortByState?.direction === 'desc' ? '-' : ''}${columns[sortByState?.index].key}`;
  const rows = createRows(roles, selectedRoles);

  useEffect(() => {
    fetchRoles({ ...pagination, orderBy });
  }, []);

  return (
    <TableToolbarViewForRoles
      isSelectable
      isCompact
      borders={false}
      columns={columns}
      rows={rows}
      sortBy={sortByState}
      onSort={(e, index, direction, isSelectable) => {
        const orderBy = `${direction === 'desc' ? '-' : ''}${columns[isSelectable ? index - 1 : index].key}`;
        setSortByState({ index, direction });
        filters && filters.length > 0
          ? fetchTableData({
              ...pagination,
              offset: 0,
              ...filters.reduce(
                (acc, curr) => ({
                  ...acc,
                  [curr.key]: curr.value,
                }),
                {}
              ),
              orderBy,
            })
          : fetchTableData({
              ...pagination,
              offset: 0,
              name: filterValue,
              orderBy,
            });
      }}
      data={roles}
      filterValue={filterValue}
      filterPlaceholder={intl.formatMessage(messages.roleName).toLowerCase()}
      fetchData={
        rolesExcluded
          ? (config) => fetchRolesForGroup(groupId, { ...config, filters: { display_name: config.name } })
          : (config) => fetchRoles({ ...config, filters: { display_name: config.name } })
      }
      setFilterValue={({ name }) => setFilterValue(name)}
      isLoading={isLoading}
      ouiaId="roles-table"
      pagination={pagination}
      checkedRows={selectedRoles}
      setCheckedItems={setCheckedItems}
      titlePlural={intl.formatMessage(messages.roles).toLowerCase()}
      titleSingular={intl.formatMessage(messages.role)}
      tableId="roles-list"
      testRoles={true}
    />
  );
};

RolesList.propTypes = {
  canSort: PropTypes.bool,
  setSelectedRoles: PropTypes.func.isRequired,
  selectedRoles: PropTypes.array,
  rolesExcluded: PropTypes.bool.isRequired,
};

RolesList.defaultProps = {
  roles: [],
  pagination: defaultCompactSettings,
  canSort: true,
};
