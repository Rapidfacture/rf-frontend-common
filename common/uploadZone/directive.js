/** rf-upload-zone-custom
 *
 * get all files in one array after the upload
 *
 * @example
 *          <rf-upload-zone on-upload="onUpload" multiple="true">
               <div class="rf-btn">
                  <i class="fa fa-plus"></i>
               </div>
            </rf-upload-zone>
 *
 * @example
 *             <rf-upload-zone
                  on-upload="onUpload"
                  multiple="true"
                  drag="true"
                  fileselect="true"
                  data="additionalDataToPass"
                  file-size-limit="10">
                <div class="col-sm-12 add">
                  <i class="fa fa-plus"></i>
                  <span>
                     <b>{{lang.importOrRequestButtonHeadline}}</b>
                     <br>
                     <small>{{lang.importOrRequestButtonSubheader}}</small>
                     <br>
                  </span>
                </div>
             </rf-upload-zone>
 *
 *  @version 0.1.0
 *
 */

app.directive('rfUploadZone', ['langFactory', function (langFactory) {
   return {
      restrict: 'E', // called on class "uploadDirective"
      // templateUrl: 'global/directives/uploadZoneCustom/template.html',
      scope: {
         onUpload: '=',
         data: '='
      },
      link: function ($scope, elem, attr) {
         $scope.lang = langFactory.getCurrentDictionary();
         // when the user clicks anywhere, open the file dialog
         // console.log('uploadZone');

         var uploadZone = elem[0];
         var hiddenInput = document.createElement('input');
         hiddenInput.multiple = !!attr.multiple || false;
         hiddenInput.type = 'file';
         hiddenInput.classList.add('hidden');
         uploadZone.appendChild(hiddenInput);
         var fileSizeLimit = attr.fileSizeLimit ? parseInt(attr.fileSizeLimit) : null;


         if (!attr.fileselect && !attr.drag) { // noting configured?
            console.log('rfUploadZone: no attributes defined. enabling drag&drop and fileselect');
            attr.fileselect = true;
            attr.drag = true;
         }

         if (attr.fileselect) {
            // console.log('Initializing upload button ...');
            hiddenInput.addEventListener('change', function () {
               upload(hiddenInput.files);
            });
            uploadZone.addEventListener('click', function () {
               hiddenInput.click();
            });
         }


         if (attr.drag) {
            // console.log('Initializing upload zone ...');
            initializeDragAndDrop(uploadZone, upload);
         }


         function upload (files) {
            var fileInfos = [];
            for (var i = 0; i < files.length; i++) {
               fileIntoMemory(files[i], i, function (fileInfo, index) {
                  // Call callback

                  if (fileSizeLimit && fileInfo && fileInfo.size > fileSizeLimit * 1000000) {
                     return $scope.$emit('note_warning', 'filesizeLimitedTo10Mb');
                  }

                  fileInfos.push(fileInfo);

                  // last file finished?
                  if (index === (files.length - 1)) {
                     $scope.onUpload(fileInfos, $scope.data);
                  }
               });
            }
         }


         // Sources:
         // https://techoverflow.net/2018/03/30/how-to-add-js-drag-drop-file-upload-without-any-dependencies/
         // https://techoverflow.net/2018/03/30/reading-an-uploaded-file-into-memory-using-pure-javascript/


         /**
          * Initialize drag & drop event handling for a DOM element.
          * The DOM element does not have to be empty in order to do this.
          * @param elem The DOM element where files can be dragged & dropped
          * @param callback The callback(files) function that gets passed a list of files
          * when files are dragged and dropped.
          *
          * Basic usage example:
          *
          *  initializeDragAndDrop(elem, function(files) {
          *     for (var i = 0; i < files.length; i++) {
          *        readAndAddFile(files[i]);
          *     }
          *  })
          */
         // eslint-disable-next-line no-unused-vars
         function initializeDragAndDrop (elem, callback) {
            elem.addEventListener('drop', function (event) {
               _dragndropPreventDefault(event);
               callback(event.dataTransfer.files);
            }, false);
            elem.addEventListener('dragover', _dragndropPreventDefault, false);
            elem.addEventListener('dragdrop', _dragndropPreventDefault, false);
            elem.addEventListener('dragenter', _dragndropPreventDefault, false);
            elem.addEventListener('dragleave', _dragndropPreventDefault, false);
         }


         /**
          * Internal utility function to prevent default
          * handling for a given event.
          */
         // eslint-disable-next-line no-unused-vars
         function _dragndropPreventDefault (event) {
            event.stopPropagation();
            event.preventDefault();
         }


         /**
          * Utility function that can be used as handler wrapper
          * for initializeDragAndDrop.
          * This reads the entire file into memory
          *
          * The handler function gets passed an array of objects:
          * {
          *     name: filename as string,
          *     size: size in bytes as number,
          *     type: MIME type as string,
          *     content: file content as Uint8Array
          * }
          * @param file The file to read
          * @param handler
          */
         function fileIntoMemory (file, index, callback) {
            // eslint-disable-next-line no-undef
            var reader = new FileReader();
            reader.onload = function () {
               callback({
                  filename: file.name,
                  size: file.size,
                  mimetype: file.type,
                  content: new Uint8Array(this.result)
               }, index);
            };
            reader.readAsArrayBuffer(file);
         }

      }
   };
}]);
