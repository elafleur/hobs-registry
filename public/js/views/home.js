
$(document).ready(function(){

	var hc = new HomeController();
	var av = new AccountValidator();
	var rv = new ResetValidator();

	$('#set-password-form').ajaxForm({
		beforeSubmit : function(formData, jqForm, options){
			rv.hideAlert();
			if (rv.validatePassword($('#newpass-tf').val()) == false){
				return false;
			} 	else{
				return true;
			}
		},
		success	: function(responseText, status, xhr, $form){
			$('#set-password-submit').hide();
			rv.showSuccess('Your password has been changed.');
			setTimeout(function(){
				$('#set-password').modal('hide');
				rv.hideAlert();
				$('#newpass-tf').val('');
				$('#set-password-submit').show();
			}, 3000);
		},
		error : function(){
			rv.showAlert('Something went wrong, please try again.');
		}
	});

	$('#account-form').ajaxForm({
		beforeSubmit: function(formData, jqForm, options) {
			if (av.validateForm() == false) {
				return false;
			} else {
			// push the disabled username field into the form data array //
				formData.push({name:'user', value:$('#user-tf').val()});
				return true;
			}
		},
		success: function(responseText, status, xhr, $form) {
			if (status == 'success') {
				hc.onUpdateSuccess();
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

// customize the account settings form //

	$('#account-form h3').text('Account');
	$('#account-form #sub1').text('Change your basic account settings');
	$('#user-tf').attr('disabled', 'disabled');
	$('#pass-tf').hide();
	$('#account-form-btn3').html('Change password');
	$('#account-form-btn1').html('Delete');
	$('#account-form-btn1').addClass('btn-danger');
	$('#account-form-btn2').html('Update');

// setup the confirm window that displays when users choose to delete their account //

	$('.modal-confirm').modal({ show : false, keyboard : true, backdrop : true });
	$('.modal-confirm .modal-header h4').text('Delete account');
	$('.modal-confirm .modal-body p').html('Are you sure you want to delete your account?');
	$('.modal-confirm .cancel').html('Cancel');
	$('.modal-confirm .submit').html('Delete');
	$('.modal-confirm .submit').addClass('btn-danger');

});
