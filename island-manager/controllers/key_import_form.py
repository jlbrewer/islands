from views.import_key_form.import_key_form import Ui_KeyImport
from PyQt5.QtWidgets import QDialog, QFileDialog, QMessageBox
from lib.key_manager import PASSWORD_LENGTH
from lib.exceptions import KeyImportError
import logging
from os import path
from lib.util import get_full_path, show_user_error_window

log = logging.getLogger(__name__)


class KeyImportForm:
    def __init__(self, parent, key_manager, config, private=False):
        self.config = config
        self.ui = Ui_KeyImport()
        self.key_manager = key_manager
        self.window = QDialog(parent)
        self.ui.setupUi(self.window)
        self.is_private = private
        self.window.setWindowTitle("Trusted key import")

        if self.is_private:
            self.setup_private_key_layout()

        self.set_handlers()

    def set_handlers(self):
        self.ui.btn_import.clicked.connect(self.check_input)
        self.ui.btn_cancel.clicked.connect(self.cancel)
        self.ui.paste_as_plain_text.clicked.connect(self.set_key_import_option)
        self.ui.import_from_file.clicked.connect(self.set_key_import_option)
        self.ui.btn_select_file.clicked.connect(self.open_select_file_dialog)
        if self.is_private:
            self.ui.is_key_encrypted.clicked.connect(self.set_existing_password_field_visibility)


    def set_existing_password_field_visibility(self):
        self.ui.existing_password.setVisible(self.ui.is_key_encrypted.isChecked())



    def set_key_import_option(self):
        ind = 0 if  self.ui.import_from_file.isChecked() else 1
        self.ui.stackedWidget.setCurrentIndex(ind)


    def setup_private_key_layout(self):
        self.window.setWindowTitle("Private key import")
        self.ui.is_key_encrypted.setVisible(True)
        self.ui.new_password.setVisible(True)
        self.ui.key_password_label.setVisible(True)
        self.ui.confirm_password.setVisible(True)


    def open_select_file_dialog(self):
        res = QFileDialog.getOpenFileName(self.window,
                                          "Select key file",
                                          get_full_path(self.config['homedir']),
                                          "Key file (*.pem)")
        if res == ('', ''):
            print("Cancelled")
        else:
            self.ui.key_file_path.setText(res[0])

    def check_input(self):
        if self.is_private:
            passwd = self.ui.new_password.text()
            confirm = self.ui.confirm_password.text()
            if passwd != confirm:
                show_user_error_window(self.window, "Password and confirmation do not match!")
                return
            if len(passwd) < PASSWORD_LENGTH:
                show_user_error_window(self.window, "Password length must be at least %d symbols" % PASSWORD_LENGTH)
                return
        if self.ui.import_from_file.isChecked():
            filepath = self.ui.key_file_path.text()
            if not path.exists(filepath):
                show_user_error_window(self.window, "Key file is not found")
                return
        if self.ui.paste_as_plain_text.isChecked() and len(self.ui.key_data.toPlainText().strip(" ")) == 0:
            show_user_error_window(self.window, "Please paste key data!")
            return
        try:
            self.process_import()
        except Exception as e:
            logging.error(e)
            show_user_error_window(self.window, e)

    def process_import(self):
        logging.debug("Importing key")
        existing_password = self.ui.existing_password.text() if self.ui.is_key_encrypted.isChecked() \
            else None
        password = self.ui.new_password.text()
        key_data = None if self.ui.import_from_file.isChecked() else \
            bytes(self.ui.key_data.toPlainText(), "utf8")
        filepath = None if self.ui.paste_as_plain_text.isChecked() else \
            self.ui.key_file_path.text()

        if self.is_private:
            try:
                logging.debug("Importing as private key")
                self.key_manager.import_private_key(
                    new_password=password,
                    existing_password=existing_password,
                    key_data=key_data,
                    alias=self.ui.key_alias.text(),
                    filepath=filepath
                )
                self._close()
            except KeyImportError as e:
                show_user_error_window(self.window, str(e))
        else:
            try:
                self.key_manager.import_public_key(
                    key_data=key_data,
                    alias=self.ui.key_alias.text(),
                    filepath=filepath
                )
                self._close()
            except KeyImportError as e:
                show_user_error_window(self.window, str(e))


    def _close(self):
        self.window.close()
        self.window.destroy()


    def cancel(self):
        self._close()
        print("Canceling")


    def exec(self):
        self.window.exec()
        print("after window.exec executing")
        return "Some value!"




