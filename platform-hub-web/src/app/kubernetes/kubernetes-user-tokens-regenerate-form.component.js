/* eslint camelcase: 0 */

export const KubernetesUserTokensRegenerateFormComponent = {
  bindings: {
    transition: '<'
  },
  template: require('./kubernetes-user-tokens-regenerate-form.html'),
  controller: KubernetesUserTokensRegenerateFormController
};

function KubernetesUserTokensRegenerateFormController($scope, $q, $state, $mdDialog, $mdSelect, Projects, AppSettings, KubernetesTokens, KubernetesGroups, roleCheckerService, hubApiService, logger, _) {
  'ngInject';

  $scope._ = _;

  const ctrl = this;

  const transitionParams = ctrl.transition && ctrl.transition.params();

  const userId = _.get(transitionParams, 'userId');
  const tokenId = _.get(transitionParams, 'tokenId');
  const fromProject = _.get(transitionParams, 'fromProject');

  ctrl.AppSettings = AppSettings;
  ctrl.Projects = Projects;

  ctrl.transitionParams = transitionParams;

  ctrl.fromProject = fromProject;
  ctrl.loading = true;
  ctrl.processing = false;
  ctrl.saving = false;
  ctrl.token = null;
  ctrl.allowedUsers = [];
  ctrl.allowedClusters = [];
  ctrl.possibleGroups = {};
  ctrl.allowedGroups = {};
  ctrl.expiryOptions = [
    {label: 'No expiration', value: null},
    {label: '1 day', value: 24 * 60 * 60},
    {label: '3 days', value: 3 * 24 * 60 * 60},
    {label: '7 days', value: 7 * 24 * 60 * 60},
    {label: '30 days', value: 30 * 24 * 60 * 60},
    {label: '90 days', value: 90 * 24 * 60 * 60}
  ];

  ctrl.createOrUpdate = createOrUpdate;
  ctrl.regenerateToken = regenerateToken;

  init();

  function init() {
    ctrl.loading = true;

    ctrl.token = null;

    fetchInitialUsers()
    .then(() => {
      if (userId && fromProject) {
        // Make sure the user specified in the params is a member of the
        // project specified in the params
        const userIsMember = _.some(ctrl.allowedUsers, u => u.id === userId);
        if (!userIsMember) {
          return bootOut();
        }
      }

      return Projects
      .refresh()
      .then(setupToken);
    })
    .finally(() => {
      ctrl.loading = false;
    });
  }

  function fetchInitialUsers() {
    if (fromProject) {
      return fetchUsers(fromProject);
    }

    return $q.when();
  }

  function bootOut() {
    logger.error('You are not allowed to access this form!');
    $state.go('home');
    return $q.reject();
  }

  function fetchUsers(projectId) {
    return Projects
    .getMemberships(projectId)
    .then(memberships => {
      ctrl.allowedUsers = _.map(memberships, 'user');
    });
  }

  function setupToken() {
    // We have an existing token, people! Look sharp!

    let fetch = null;
    if (fromProject) {
      fetch = Projects
      .getKubernetesUserToken(fromProject, tokenId)
      .catch(bootOut);
    } else {
      fetch = KubernetesTokens
      .getToken(tokenId)
      .catch(bootOut);
    }

    return fetch
    .then(token => {
      ctrl.token = token;

      if (fromProject && ctrl.token.project.id !== fromProject) {
        return bootOut();
      }

      if (userId && ctrl.token.user.id !== userId) {
        return bootOut();
      }

      return refreshForProject();
    });
  }

  function refreshForProject() {
    return fetchUsers(ctrl.token.project.id)
    .then(fetchClusters)
    .then(fetchGroups)
    .then(filterGroups);
  }

  function fetchClusters() {
    ctrl.allowedClusters = [];

    const projectId = _.get(ctrl.token, 'project.id');

    if (projectId) {
      return Projects
      .getKubernetesClusters(projectId)
      .then(clusters => {
        ctrl.allowedClusters = clusters;
      });
    }

    return $q.when();
  }

  function fetchGroups() {
    ctrl.possibleGroups = {};
    ctrl.allowedGroups = {};

    const projectId = _.get(ctrl.token, 'project.id');

    if (projectId) {
      return Projects
      .getAllKubernetesGroupsGrouped(projectId, 'user')
      .then(grouped => {
        ctrl.possibleGroups = grouped;
      });
    }

    return $q.when();
  }

  function filterGroups() {
    ctrl.allowedGroups = {};

    const clusterName = _.get(ctrl.token, 'cluster.name');

    if (clusterName) {
      const seen = {};
      ctrl.allowedGroups = Object.keys(ctrl.possibleGroups).reduce((acc, key) => {
        const forCluster = KubernetesGroups
        .filterGroupsForCluster(ctrl.possibleGroups[key], clusterName)
        .filter(g => !g.is_privileged);

        // Need to consider dup groups between services etc.
        const dedupped = forCluster.filter(g => {
          const allowed = !seen[g.name];
          seen[g.name] = 1;
          return allowed;
        });

        if (!_.isEmpty(dedupped)) {
          acc[key] = dedupped;
        }

        return acc;
      }, {});
    }
  }

  function createOrUpdate() {
    if (ctrl.kubernetesTokenForm.$invalid) {
      logger.error('Check the form for issues before saving');
      return;
    }

    ctrl.saving = true;

    let promise = null;

    if (fromProject) {
      promise = Projects.createKubernetesUserToken(ctrl.token.project.id, ctrl.token);
    } else {
      promise = KubernetesTokens.createUserToken(ctrl.token.user.id, ctrl.token);
    }

    promise = promise
    .then(() => {
      logger.success('New kubernetes user token created');
    });

    return promise
    .then(() => {
      if (fromProject) {
        $state.go('projects.detail', {id: fromProject});
      } else {
        $state.go('kubernetes.user-tokens.list', {userId: ctrl.token.user.id});
      }
    })
    .finally(() => {
      ctrl.saving = false;
    });
  }

  function regenerateToken(targetEvent) {
    const confirm = $mdDialog.confirm()
    .title(`Are you sure?`)
    .textContent(`This will delete the previous token permanently and create a new token.`)
    .ariaLabel('Confirm token deletion')
    .targetEvent(targetEvent)
    .ok('Do it')
    .cancel('Cancel');

    $mdDialog
    .show(confirm)
    .then(() => {
      ctrl.busy = true;

      let promise = null;

      if (ctrl.fromProject) {
        if (ctrl.token.kind === 'user') {
          promise = Projects.deleteKubernetesUserToken(ctrl.fromProject, ctrl.token.id);
        }
      } else {
        promise = KubernetesTokens.deleteToken(ctrl.token.id);
      }

      return promise
      .then(() => {
        createOrUpdate();
      })
      .finally(() => {
        ctrl.busy = false;
      });
    });
  }
}
