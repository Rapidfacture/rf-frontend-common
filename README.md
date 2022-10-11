# rf-frontend-common

Common Frontend components like style, dialog, images.
JS Requires Angular (Factories, Directives)

## Installation

* exclude the folder `global/common` from git in your `.gitignore`
```
global/common
```
* add actual version of `rf-frontend-common` to you package.json

* copy the `common` folder from this package into your project using grunt
* include the important required files (variables.scss, etc.) in correct order - stick to other grunt files


## Development
* edit the files in the common folder in your project
* when working correct, update the `rf-frontend-common` project
* push the new version to our server and publish on npm

## Usage
* Call endpoint names as specified in backend API
* POST and GET methods will be appended with 'get-' or 'post-' automatically
* Standard requests will be always converted to POST method to prevent errors with large requests
