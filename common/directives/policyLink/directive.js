/** rf policy link
 * @desc
 *  display the rapidfacture policy link
 *
 * @version 0.1.0
 *
 * @example
 *     <rf-policy-link></rf-policy-link>
 *
 */

app.directive('rfPolicyLink', ['http', 'langFactory', 'config', function (http, langFactory, config) { // save json drawing
   return {
      restrict: 'E',
      scope: '=',
      // NOTE: we load this template here as it throws an error in the login process otherwise
      template: '<div class="privacy-info"><i class="fa fa-lock"></i><a href="{{privacyPolicyLink}}" target="_blank" rel="noopener">{{lang.privacyPolicy}}</a></div>',
      link: function ($scope, elem, attr, ctrl) {
         $scope.privacyPolicyLink = config.privacyPolicyLink;
      }
   };
}]);
