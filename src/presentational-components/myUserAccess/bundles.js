export const bundleData = [
  {
    entitlement: 'application_services',
    title: 'Application Services',
    apps: {
      'Streams for Apache Kafka (beta)': '/',
      'API Management (beta)': '/',
      'Data Science (private beta)': '/',
    },
  },
  {
    entitlement: 'openshift',
    title: 'OpenShift',
    apps: {
      clusters: '/',
      advisor: '/insights/advisor',
      subscriptions: '/subscriptions',
      'cost management': '/cost-management',
    },
    appsIds: ['cost-management', 'subscriptions', 'ocp-advisor', 'ocm'],
  },
  {
    entitlement: 'rhel',
    title: 'Red Hat Enterprise Linux',
    apps: {
      advisor: '/advisor',
      compliance: '/compliance',
      drift: '/drift',
      'image builder': '/image-builder',
      patch: '/patch',
      vulnerability: '/vulnerability',
      policies: '/policies',
      subscriptions: '/subscriptions',
    },
    appsIds: [
      'dashboard',
      'patch',
      'advisor',
      'drift',
      'vulnerability',
      'policies',
      'compliance',
      'inventory',
      'notifications',
      'image-builder',
      'subscriptions',
    ],
  },
  {
    entitlement: 'ansible',
    title: 'Ansible Automation Platform',
    apps: {
      'automation hub': '/automation-hub',
      'automation services catalog': '/catalog',
      insights: '/automation-analytics',
    },
    appsIds: ['catalog', 'approval', 'automation-analytics', 'automation-hub'],
  },
];
