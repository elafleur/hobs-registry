
$(document).ready(function() {

	var av = new AccountValidator();
	var sc = new SignupController();

	$('#account-form').ajaxForm( {
		beforeSubmit: function(formData, jqForm, options) {
			return av.validateForm();
		},
		success: function(responseText, status, xhr, $form) {
			if (status == 'success') {
				$('.modal-alert').modal('show');
			}
		},
		error: function(e) {
			if (e.responseText == 'email-taken') {
			  av.showTakenEmail();
			}	else if (e.responseText == 'username-taken') {
			  av.showTakenUserName();
			}	else if (e.responseText == 'username-invalid') {
			  av.showInvalidUserName();
			}
		}
	});
	$('#name-tf').focus();

// customize the account signup form //

	$('#account-form h3').text('Sign up');
	$('#account-form #sub1').text('Create your personal account');
	$('#account-form #sub2').text('Pick a username and create a password');
	$('#account-form-btn1').html('Cancel');
	$('#account-form-btn2').html('Create');
	$('#account-form-btn2').addClass('btn-primary');
	$('#account-form-btn3').hide();

// setup the alert that displays when an account is successfully created //

	$('.modal-alert').modal({ show:false, keyboard : false, backdrop : 'static' });
	$('.modal-alert .modal-header h4').text('Account created');
	$('.modal-alert .modal-body p').html('Your account has been created.</br>You can now publish Hobs packages to this registry.');

});
