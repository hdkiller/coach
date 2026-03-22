const DEFAULT_SCOPE = { target: 'self' }
const DEFAULT_DATE_RANGE = null

function isScopeMetaEntry(entry: any) {
  return entry?._meta?.type === 'dashboard-scope'
}

export function decodeDashboardLayout(layout: any) {
  const items = Array.isArray(layout) ? layout : []
  const metaEntry = items.find(isScopeMetaEntry)
  const widgets = items.filter((entry) => !isScopeMetaEntry(entry))

  return {
    scope: metaEntry?._meta?.scope || DEFAULT_SCOPE,
    dateRange: metaEntry?._meta?.dateRange || DEFAULT_DATE_RANGE,
    layout: widgets
  }
}

export function encodeDashboardLayout(layout: any, scope?: any, dateRange?: any) {
  const widgets = (Array.isArray(layout) ? layout : []).filter((entry) => !isScopeMetaEntry(entry))
  return [
    {
      _meta: {
        type: 'dashboard-scope',
        scope: scope || DEFAULT_SCOPE,
        dateRange: dateRange || DEFAULT_DATE_RANGE
      }
    },
    ...widgets
  ]
}
