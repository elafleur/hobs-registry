
function ResetValidator() {
// modal window to allow users to reset their password //
	this.setPassword = $('#set-password');
	this.setPassword.modal({ show : false, keyboard : false, backdrop : 'static' });
	this.setPasswordAlert = $('#set-password .alert');
}

ResetValidator.prototype.validatePassword = function(s) {
	if (s.length >= 8) {
		return true;
	}	else {
		this.showAlert('Password must be at least 8 characters');
		return false;
	}
};

ResetValidator.prototype.showAlert = function(m) {
	this.setPasswordAlert.attr('class', 'alert alert-danger');
	this.setPasswordAlert.html(m);
	this.setPasswordAlert.show();
};

ResetValidator.prototype.hideAlert = function() {
	this.setPasswordAlert.hide();
};

ResetValidator.prototype.showSuccess = function(m) {
	this.setPasswordAlert.attr('class', 'alert alert-success');
	this.setPasswordAlert.html(m);
	this.setPasswordAlert.fadeIn(500);
};
