
$(document).ready(function() {

	var rv = new ResetValidator();

	$('#set-password-form').ajaxForm({
		beforeSubmit: function(formData, jqForm, options) {
			rv.hideAlert();
			if (rv.validatePassword($('#newpass-tf').val()) == false) {
				return false;
			} else {
				return true;
			}
		},
		success: function(responseText, status, xhr, $form) {
			rv.showSuccess('Your password has been changed.');
			setTimeout(function(){ window.location.href = '/'; }, 3000);
		},
		error: function() {
			rv.showAlert('Something went wrong, please try again.');
		}
	});

	$('#set-password').modal('show');
	$('#set-password').on('shown', function(){ $('#newpass-tf').focus(); });

});
