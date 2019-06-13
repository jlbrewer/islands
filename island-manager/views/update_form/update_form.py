# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file '../views/update_form/update_form.ui'
#
# Created by: PyQt5 UI code generator 5.12.2
#
# WARNING! All changes made in this file will be lost!

from PyQt5 import QtCore, QtGui, QtWidgets


class Ui_IslandsUpdate(object):
    def setupUi(self, IslandsUpdate):
        IslandsUpdate.setObjectName("IslandsUpdate")
        IslandsUpdate.resize(592, 460)
        self.verticalLayout = QtWidgets.QVBoxLayout(IslandsUpdate)
        self.verticalLayout.setObjectName("verticalLayout")
        self.label = QtWidgets.QLabel(IslandsUpdate)
        font = QtGui.QFont()
        font.setPointSize(12)
        font.setBold(True)
        font.setWeight(75)
        self.label.setFont(font)
        self.label.setObjectName("label")
        self.verticalLayout.addWidget(self.label)
        self.opt_download = QtWidgets.QRadioButton(IslandsUpdate)
        self.opt_download.setChecked(True)
        self.opt_download.setObjectName("opt_download")
        self.group_options = QtWidgets.QButtonGroup(IslandsUpdate)
        self.group_options.setObjectName("group_options")
        self.group_options.addButton(self.opt_download)
        self.verticalLayout.addWidget(self.opt_download)
        self.opt_from_file = QtWidgets.QRadioButton(IslandsUpdate)
        self.opt_from_file.setObjectName("opt_from_file")
        self.group_options.addButton(self.opt_from_file)
        self.verticalLayout.addWidget(self.opt_from_file)
        self.stack_inputs = QtWidgets.QStackedWidget(IslandsUpdate)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Minimum, QtWidgets.QSizePolicy.Maximum)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.stack_inputs.sizePolicy().hasHeightForWidth())
        self.stack_inputs.setSizePolicy(sizePolicy)
        self.stack_inputs.setObjectName("stack_inputs")
        self.page_2 = QtWidgets.QWidget()
        self.page_2.setObjectName("page_2")
        self.horizontalLayout_3 = QtWidgets.QHBoxLayout(self.page_2)
        self.horizontalLayout_3.setObjectName("horizontalLayout_3")
        self.magnet_link = QtWidgets.QLineEdit(self.page_2)
        self.magnet_link.setObjectName("magnet_link")
        self.horizontalLayout_3.addWidget(self.magnet_link)
        self.stack_inputs.addWidget(self.page_2)
        self.page = QtWidgets.QWidget()
        self.page.setObjectName("page")
        self.horizontalLayout_4 = QtWidgets.QHBoxLayout(self.page)
        self.horizontalLayout_4.setObjectName("horizontalLayout_4")
        self.image_selection = QtWidgets.QWidget(self.page)
        self.image_selection.setObjectName("image_selection")
        self.horizontalLayout = QtWidgets.QHBoxLayout(self.image_selection)
        self.horizontalLayout.setContentsMargins(0, 12, 0, -1)
        self.horizontalLayout.setObjectName("horizontalLayout")
        self.path_to_image = QtWidgets.QLineEdit(self.image_selection)
        self.path_to_image.setReadOnly(True)
        self.path_to_image.setObjectName("path_to_image")
        self.horizontalLayout.addWidget(self.path_to_image)
        self.btn_select_image_file = QtWidgets.QPushButton(self.image_selection)
        self.btn_select_image_file.setObjectName("btn_select_image_file")
        self.horizontalLayout.addWidget(self.btn_select_image_file)
        self.horizontalLayout_4.addWidget(self.image_selection)
        self.stack_inputs.addWidget(self.page)
        self.verticalLayout.addWidget(self.stack_inputs)
        self.output_console = QtWidgets.QTextBrowser(IslandsUpdate)
        self.output_console.setVisible(False)
        self.output_console.setObjectName("output_console")
        self.verticalLayout.addWidget(self.output_console)
        spacerItem = QtWidgets.QSpacerItem(20, 40, QtWidgets.QSizePolicy.Minimum, QtWidgets.QSizePolicy.Expanding)
        self.verticalLayout.addItem(spacerItem)
        self.horizontalLayout_2 = QtWidgets.QHBoxLayout()
        self.horizontalLayout_2.setSpacing(34)
        self.horizontalLayout_2.setObjectName("horizontalLayout_2")
        spacerItem1 = QtWidgets.QSpacerItem(40, 20, QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Minimum)
        self.horizontalLayout_2.addItem(spacerItem1)
        self.btn_cancel = QtWidgets.QPushButton(IslandsUpdate)
        self.btn_cancel.setMinimumSize(QtCore.QSize(100, 40))
        font = QtGui.QFont()
        font.setPointSize(10)
        font.setBold(True)
        font.setWeight(75)
        self.btn_cancel.setFont(font)
        self.btn_cancel.setStyleSheet("color: #555")
        self.btn_cancel.setObjectName("btn_cancel")
        self.horizontalLayout_2.addWidget(self.btn_cancel)
        self.btn_update = QtWidgets.QPushButton(IslandsUpdate)
        self.btn_update.setEnabled(False)
        self.btn_update.setMinimumSize(QtCore.QSize(100, 40))
        self.btn_update.setMaximumSize(QtCore.QSize(16777215, 16777215))
        font = QtGui.QFont()
        font.setPointSize(10)
        font.setBold(True)
        font.setWeight(75)
        self.btn_update.setFont(font)
        self.btn_update.setStyleSheet("QPushButton:enabled {\n"
"    color: green;\n"
"}\n"
"\n"
"QPushButton:disabled{\n"
"    color: #777;\n"
"}")
        icon = QtGui.QIcon()
        icon.addPixmap(QtGui.QPixmap(":/images/icons/island24.png"), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        self.btn_update.setIcon(icon)
        self.btn_update.setDefault(False)
        self.btn_update.setObjectName("btn_update")
        self.horizontalLayout_2.addWidget(self.btn_update)
        self.verticalLayout.addLayout(self.horizontalLayout_2)

        self.retranslateUi(IslandsUpdate)
        self.stack_inputs.setCurrentIndex(0)
        QtCore.QMetaObject.connectSlotsByName(IslandsUpdate)

    def retranslateUi(self, IslandsUpdate):
        _translate = QtCore.QCoreApplication.translate
        IslandsUpdate.setWindowTitle(_translate("IslandsUpdate", "Islands VM Update"))
        self.label.setText(_translate("IslandsUpdate", "How would you like to update Islands?"))
        self.opt_download.setText(_translate("IslandsUpdate", "Download via magnet link"))
        self.opt_from_file.setText(_translate("IslandsUpdate", "Import from file"))
        self.magnet_link.setPlaceholderText(_translate("IslandsUpdate", "Paste magnet link here"))
        self.path_to_image.setPlaceholderText(_translate("IslandsUpdate", "Path to Islands VM image"))
        self.btn_select_image_file.setText(_translate("IslandsUpdate", "Select file"))
        self.btn_cancel.setText(_translate("IslandsUpdate", "Cancel"))
        self.btn_update.setText(_translate("IslandsUpdate", "Update"))


import resources_rc
