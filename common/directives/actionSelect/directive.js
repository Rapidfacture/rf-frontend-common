/** button with further options in select
 *
 *
 * @version 0.0.5
 *
 * @example ng-model holds array of objects with functions to call
 *     <rf-action-select ng-model="functions"></rf-tag-select>
 *
 *     <rf-action-select ng-model="functions" data="order"></rf-tag-select>
 *
 *     <rf-action-select ng-model="functions" callback="callbackFunktion" show-options="option"></rf-tag-select>
 *
 **/
app.directive('rfActionSelect', ['langFactory', '$timeout', 'helperFactory', function (langFactory, $timeout, helperFactory) { // save json drawing
   return {
      restrict: 'E',
      require: 'ngModel',
      scope: {
         ngModel: '=',
         data: '=',
         onToggle: '=?',
         showOptions: '=?'
      },
      templateUrl: 'global/common/directives/actionSelect/template.html',
      link: function ($scope, elem, attr, ctrl) {
         $scope.mainFunction = null;
         $scope.otherFunctions = [];
         $scope.ngModel = $scope.ngModel || [];

         $scope.$on('languageSet', function (meta, lang) { // reload on change
            refreshFunctions();
         });

         $scope.selectFunction = function (item) {
            item.function($scope.data);
            closeDropdown();
         };

         function refreshFunctions () {
            $scope.otherFunctions = [];

            $scope.ngModel.forEach(function (item, $index) {
               item.translation = langFactory.translate(item.label);
               if (item.elemNumber) item.translation += item.elemNumber;

               if ($index === 0) {
                  $scope.mainFunction = item;
               } else {
                  $scope.otherFunctions.push(item);
               }
            });

            if (attr.hasOwnProperty('dynamicWidth')) {
               var pixelMultiplier = 8;
               var widths = $scope.ngModel.map(function (item) {
                  return item.translation.length * pixelMultiplier;
               });

               var maxItemWidth = Math.max.apply(null, widths);
               var firstItemWidth = widths[0];
               var paddingOffset = 45;

               $scope.dynamicWidthDropDown = maxItemWidth + 'px';
               $scope.dynamicWidth = (firstItemWidth + paddingOffset) + 'px';
            }
         }

         ctrl.$formatters.unshift(function (value) { // ngModel set external from code => refresh
            // checks if not undefined to prevent showing current date
            if (value) refreshFunctions();
         });

         // if there is no change - force refresh; needed in e2e on server
         $timeout(refreshFunctions, 1000);

         $scope.toggle = function () {
            $scope.showOptions = !$scope.showOptions;
            if ($scope.onToggle) $scope.onToggle();
         };

         function closeDropdown () {
            $timeout(function () { $scope.showOptions = false; });
         }

         var removeListener = new helperFactory.elemOutsideClickListener(elem[0], closeDropdown);
         $scope.$on('$destroy', removeListener);

      }
   };
}]);
