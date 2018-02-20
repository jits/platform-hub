export const appConfig = function ($mdIconProvider, $mdThemingProvider, $httpProvider, jwtOptionsProvider, ivhTreeviewOptionsProvider) {
  'ngInject';

  $mdIconProvider
    .icon('menu', './assets/svg/menu.svg', 24);

  $mdThemingProvider.theme('default')
    .primaryPalette('deep-purple')
    .accentPalette('red');

  // Set up authenticated API access
  jwtOptionsProvider.config({               // eslint-disable-line
    tokenGetter: authService => {
      'ngInject';

      return authService.getToken();
    }
  });
  $httpProvider.interceptors.push('apiInterceptorService');
  $httpProvider.interceptors.push('jwtInterceptor');

  // Based on: https://codepen.io/kasajian/pen/MyWyMo
  ivhTreeviewOptionsProvider.set({
    defaultSelectedState: false,
    validate: true,
    useCheckboxes: false,
    expandToDepth: -1,
    twistieCollapsedTpl: '<md-icon>chevron_right</md-icon>',
    twistieExpandedTpl: '<md-icon>expand_more</md-icon>',
    twistieLeafTpl: '<span style="cursor: default;">&#8192;&#8192;</span>'
  });
};
