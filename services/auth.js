angular.module('AskUs.authService', [])

.factory('Auth', ['rootRef', '$firebaseAuth', function(rootRef, $firebaseAuth) {
  return $firebaseAuth(rootRef);
}])

.factory('userAuth', [
  'Auth', '$http', '$localstorage', '$state', 'FirebaseUrl', '$window', 'currentUserInfos', '$rootScope', 'DevelopmentAPI', 'ProductionAPI',
  function(Auth, $http, $localstorage, $state, FirebaseUrl, $window, currentUserInfos, $rootScope, DevelopmentAPI, ProductionAPI) {

  var isAuth = function() {
    return !!$localstorage.get('firebase:session::askus-app');
  };

  var loginWithFacebook = function() {
    Auth.$authWithOAuthPopup('facebook',{rememberMe: true, scope: 'email, user_friends'})
    .then(function(authData) {

      var userDataToSave = authData.facebook;
      var firebase = new Firebase(FirebaseUrl + '/');
      var userRef = firebase.child("users/");

      // Check if the user exist in the DB
      userRef.orderByChild("id").equalTo(authData.facebook.id).once("value", function(snapshot) {
        if (!snapshot.exists()) {
          // Create new user in the database
          userRef.push(userDataToSave, function(error, authData) {
            if (error) {
              // console.log("saving Failed!", error);
              $rootScope.$emit('errorModal');
            } else {
              // console.log('saving ok');
              // Redirection to the how to use page
              $state.go('how-to-use');
            }
          });
        } else {
          // console.log('user already exists');
          // Redirect to Dash page
          $state.go('tab.dash');
        }
      });
    }, function() {
      $rootScope.$emit('errorModal');
    });
  };

  var logoutFacebook = function() {
    Auth.$unauth();
    // Remove facebook stored cookies
    window.cookies.clear(function() {
      $window.location.reload();
      $window.location.href = '#/splash';   
    });
  };

  var suspendAccountFacebook = function(id) {
    // Get FB access token for removeing app permission
    var currentUser = currentUserInfos.currentUserInfoGet();
    var currentUserFBToken = currentUser.accessToken;

    return $http({
      method: 'DELETE',
      url: ProductionAPI + '/api/user/delete/'+ id
    }).success(function successCallback(response) {
        //console.log('delete success');

        FB.api('/me/permissions?access_token=' + currentUserFBToken, 'delete', function(responseFB) {
          Auth.$unauth();
          angular.element("#preferences-page .loading").hide();
          angular.element("#preferences-page .loading-icon").removeClass('spin');
          angular.element("#preferences-page .button.suspend").prop("disabled",false);
          
          window.cookies.clear(function() {
            $window.location.reload();
            $window.location.href = '#/splash';   
          });
        });

      return response;
    }).error(function(response) {
      //console.log('error deleting user')
    });
  };

  return {
    isAuth: isAuth,
    loginWithFacebook: loginWithFacebook,
    logoutFacebook: logoutFacebook,
    suspendAccountFacebook: suspendAccountFacebook
  };
}]);
