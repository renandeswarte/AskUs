angular.module('myApp.dashFilterTab', ['myApp.env'])

.controller('DashFilterCtrl', 
  ['$scope', '$stateParams', '$state', '$ionicSideMenuDelegate', 'Categories', 'Post', '$timeout', '$rootScope', '$ionicModal', '$ionicSlideBoxDelegate', 'usersInfos', 'Vote', 'currentUserInfos', 
  function($scope, $stateParams, $state, $ionicSideMenuDelegate, Categories, Post, $timeout, $rootScope, $ionicModal, $ionicSlideBoxDelegate, usersInfos, Vote, currentUserInfos) {

  // Get route parent
  $scope.parentCategory = $stateParams.filter;

  var pageName = '#dash-filter-page';

  // Close menu
  $ionicSideMenuDelegate.toggleLeft(false);

  $scope.posts;
  $scope.aImages;
  $scope.noMoreData = false;

  var newPostLimit = 2;
  var postTotalMax = 0;
  var totalPostNumber = 0;
  var totalPost;
  var displayedPost;

  // $rootScope.$on('dashRefresh', function() {
  //   $scope.doRefresh();
  // });

  $scope.doRefresh = function() {
    angular.element(pageName +' .icon-refreshing').addClass('spin');
    $scope.noMoreData = false;
    $scope.posts = {};

    newPostLimit = 2;
    postTotalMax = 0;
    totalPostNumber = 0;
    totalPost;
    displayedPost;

    Categories.getAllPostsByCategory($stateParams.filter, newPostLimit).then(function(postsData) {
      postTotalMax += newPostLimit;

      totalPostNumber = postsData.number;
      if (totalPostNumber === 0) {
        $scope.noMoreData = true;
      }

      $scope.posts = postsData.values  ;
    });

    $scope.$broadcast('scroll.refreshComplete');
     $timeout(function(){
      angular.element(pageName +' .icon-refreshing').removeClass('spin');
    }, 500);
  };

  $scope.loadMore = function() {
    angular.element(pageName +' .icon-refreshing').addClass('spin');
      if (totalPostNumber === 0) {
          angular.element(pageName +' ion-infinite-scroll').css('margin-top', ((screen.height / 2) - 90) + 'px');
          // Get the previous last 5 posts
          Categories.getAllPostsByCategory($stateParams.filter, newPostLimit).then(function(postsData) {
            postTotalMax += newPostLimit;

            totalPostNumber = postsData.number;
            if (totalPostNumber === 0) {
              $scope.noMoreData = true;
            }

            $scope.posts = postsData.values;

            angular.element(pageName +' .icon-refreshing').removeClass('spin');
            angular.element(pageName +' ion-infinite-scroll').css('margin-top', '0px');
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
      } else {
        Categories.getAllPostsByCategoryInfinite($stateParams.filter, totalPostNumber, newPostLimit).then(function(postsData) {
          postTotalMax += newPostLimit;
          totalPostNumber = postsData.number;

          if( postsData.number !== postTotalMax ) {
            $scope.noMoreData = true;
          } else {
            var newObjToAdd = Categories.getFirstXElements(postsData.values , newPostLimit)
            var updatedPost = angular.extend({}, $scope.posts, newObjToAdd);
            $scope.posts = updatedPost;
          }
          angular.element(pageName +' .icon-refreshing').removeClass('spin');
          $scope.$broadcast('scroll.infiniteScrollComplete');
        })
    }
  };

  // ****** Next page functions ******
  $scope.userPage = function(userId, userName, userPicture) {
    var user = {
      id: userId,
      name: userName,
      picture: userPicture
    };
    usersInfos.singleUserInfoSet(user);
  };

  $scope.postPage = function(uid, data) {
    var postData = {
      uid: uid,
      data: data
    };
    Post.singlePostInfoSet(postData);
  };

  // ****** Vote functions ******
  $scope.vote = function(post, element) {
    angular.element(pageName +' .card[data-postid='+ post.$key +'] .vote-loading .loading-icon').addClass('spin');
    angular.element(pageName +' .card[data-postid='+ post.$key +'] .vote-loading').removeClass('hide');
    Vote.addVote(post.$key, element).then(function(){
      angular.element(pageName +' .card[data-postid='+ post.$key +'] .vote-loading .loading-icon').removeClass('spin');
      angular.element(pageName +' .card[data-postid='+ post.$key +']').addClass('voted voted-'+ element);

      // Hide voting button block and show radials
      post.hasVoted = true;

      // Keep for now
      // angular.element(pageName +' .card[data-postid='+ post.$key +'] .vote-buttons-container').hide();
      // angular.element(pageName +' .card[data-postid='+ post.$key +'] .results-container').fadeIn();

      (element === "A") ? post.voteATotal++ : post.voteBTotal++;

      post.totalA = Vote.calculTotalRatio(post.voteATotal, post.voteBTotal);
      post.totalB = Vote.calculTotalRatio(post.voteBTotal, post.voteATotal);

      // Add post to the update list for the Dash page
      Vote.addVoteToUpdate("dash-page", post.$key, element, post.totalA, post.totalB);

      // Create the Radials
      Vote.addRadial("A", post.$key, '#33cd5f', post.totalA, 1000, pageName);
      Vote.addRadial("B", post.$key, '#387ef5', post.totalB, 1000, pageName);

    }, function(){
      angular.element(pageName +' .card[data-postid='+ post.$key +'] .vote-loading').addClass('hide');
      angular.element(pageName +' .card[data-postid='+ post.$key +'] .vote-loading .loading-icon').removeClass('spin');
      console.log("vote failed");
    })
  };

  $scope.checkVote = function(post) {
    var currentUser = currentUserInfos.currentUserInfoGet();
    // Check if user has vote this post
    if (post.voters) {
      if (post.voters[currentUser.id]) {
        post.totalA = Vote.calculTotalRatio(post.voteATotal, post.voteBTotal);
        post.totalB = Vote.calculTotalRatio(post.voteBTotal, post.voteATotal);
        // Timeout required for updating the view and render the radials
        $timeout(function(){
          //Show Radial block hide Buttons
          post.hasVoted = true;
          angular.element(pageName +' .card[data-postid='+ post.$key +']').addClass('voted voted-'+ post.voters[currentUser.id]);

          // Keep for now
          // angular.element(pageName +' .card[data-postid='+ post.$key +'] .vote-buttons-container').hide();
          // angular.element(pageName +' .card[data-postid='+ post.$key +'] .results-container').show();
          Vote.addRadial("A", post.$key, '#33cd5f', post.totalA, 1, pageName);
          Vote.addRadial("B", post.$key, '#387ef5', post.totalB, 1, pageName);
        }, 0);    
      }
    }
    // check if user own post
    if (post.userId === currentUser.id) {
      $timeout(function(){
        angular.element(pageName +' .card[data-postid='+ post.$key +']').addClass('my-post');
      }, 0);
    }
  };

  $scope.deletePost = function(id) {
    Post.deletePost(id).then(function(){
      angular.element(pageName +' .card[data-postid='+ id +']').fadeOut(500);
      $scope.deleteModal.hide();
    }, function(){
      $scope.deleteModal.hide();
      console.log("delete failed");
    })
  }

  // ****** Modal functions ******
  $scope.modalPictureUpdate =  function(data) {
    $scope.aImages = [{
      'src': data.pictureA
    }, {
      'src': data.pictureB
    }];
  };

  $scope.postDelete = {};

  $ionicModal.fromTemplateUrl('post-delete-modal.html', {
    scope: $scope,
    animation: 'mh-slide' //'slide-in-up'
  }).then(function(modal) {
    $scope.deleteModal = modal;
  });

  $ionicModal.fromTemplateUrl('image-modal.html', {
    scope: $scope,
    animation: 'mh-slide' //'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  });

  $scope.showDeleteModal = function(key, title) {
    $scope.postDelete.title = title;
    $scope.postDelete.id = key;
    $scope.deleteModal.show();
  };

  $scope.closeDeleteModal = function() {
    $scope.deleteModal.hide();
  };

  $scope.openModal = function() {
    $ionicSlideBoxDelegate.slide(0);
    $scope.modal.show();
  };

  $scope.closeModal = function() {
    $scope.modal.hide();
  };

  // Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });

  $scope.goToSlide = function(index) {
    $scope.modal.show();
    $ionicSlideBoxDelegate.slide(index);
  };

  // Called each time the slide changes
  $scope.slideChanged = function(index) {
    $scope.slideIndex = index;
  };

}]);