
$(document).ready(function(){

	var lv = new LoginValidator();
	var lc = new LoginController();

// main login form //

	$('#login').ajaxForm({
		beforeSubmit: function(formData, jqForm, options) {
			if (lv.validateForm() == false) {
				return false;
			} else {
				return true;
			}
		},
		success: function(responseText, status, xhr, $form) {
			if (status == 'success') {
				window.location.href = '/home';
			}
		},
		error: function(e) {
			lv.showLoginError('Sign in Failed', e.responseText);
		}
	});
	$('#user-tf').focus();

// login retrieval form via email //

	var ev = new EmailValidator();

	$('#get-credentials-form').ajaxForm({
		url: '/lost-password',
		beforeSubmit: function(formData, jqForm, options) {
			if (ev.validateEmail($('#email-tf').val())) {
				ev.hideEmailAlert();
				return true;
			}	else {
				ev.showEmailAlert('Invalid email address.');
				return false;
			}
		},
		success: function(responseText, status, xhr, $form) {
			$('#cancel').show();
			$('#retrieve-password-submit').hide();
			ev.showEmailSuccess('You will receive an email that includes a password reset link.');
		},
		error: function(e) {
			if (e.responseText == 'email-not-found') {
				ev.showEmailAlert('Can\'t find that email, sorry.');
			}	else {
				$('#cancel').show();
				$('#retrieve-password-submit').hide();
				ev.showEmailAlert('An unexpected error occurred.');
			}
		}
	});

});
