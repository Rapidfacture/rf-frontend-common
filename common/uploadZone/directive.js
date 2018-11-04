/** rfUploadZone
 * @desc a drag & drop upload zone that also opens the upload dialog on click
 *
 * @version 0.1.0, 07.10.2018
 *
 * @example  <rf-upload-zone onupload="upload"></rf-upload-zone>
 *
 * @return array of files:
  * [{
 *    content (contentUint8Array)
 *    name
 *    type
 *    size
 *    extension
 *  }]
 */

/* global initializeDragAndDrop readFileIntoMemory  */

app.directive('rfUploadZoneTest', ['langFactory', function (langFactory) {
   return {
      restrict: 'E', // called on element "rfUploadZoneTest"
      // templateUrl: 'global/directives/uploadZone/template.html',
      scope: {
         onUpload: '='
      },
      link: function ($scope, elem, attr) {
         $scope.lang = langFactory.getCurrentDictionary();

         var uploadZone = elem[0];
         var hiddenInput = document.createElement('input');
         hiddenInput.type = 'file';
         hiddenInput.classList.add('hidden');

         // listen to: drag & drop upload
         initializeDragAndDrop(uploadZone[0], readFilesAndPassThem);

         // On file upload by click on the upload zone
         hiddenInput.addEventListener('change', function () {
            var files = hiddenInput.files;
            readFilesAndPassThem(files);
         });


         uploadZone.appendChild(hiddenInput);
         uploadZone.addEventListener('click', function () {
            hiddenInput.click();
         });


         // transfer files from inputs in one array in memory; then pass it to callback
         function readFilesAndPassThem (files) {
            var i = 0;
            var fileInfos = [];

            function readNextFile () {
               if (i < files.length) {
                  readFileIntoMemory(files[i], function (fileInfo) {
                     addFileExtension(fileInfo);
                     fileInfos.push(fileInfo);
                     i++;
                     readNextFile();
                  });
               } else { // when ready, pass the array to callback
                  $scope.onUpload(fileInfos);
               }
            }
            readNextFile();
         }

         function addFileExtension (file) {
            var array = file.name.split('.');
            var lastElement = array[array.length - 1];
            if (lastElement) file.extension = lastElement;
         }

      }
   };
}]);
