/** rf policy link
 * @desc
 *  display the rapidfacture policy link
 *
 * @version 0.0.5
 *
 * @example
 *     <rf-policy-link></rf-policy-link>
 *
 */

app.directive('rfPolicyLink', ['http', 'langFactory', 'config', function (http, langFactory, config) { // save json drawing
   return {
      restrict: 'E',
      scope: '=',
      templateUrl: 'global/common/directives/policyLink/template.html',
      link: function ($scope, elem, attr, ctrl) {
         $scope.termsAndPolicyLink = config.termsAndPolicyLink;
      }
   };
}]);
