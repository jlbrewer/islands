import sys
from PyQt5.QtWidgets import QApplication, QMainWindow,  QDialog, QMessageBox as QM, QPushButton, QVBoxLayout, QWidget
from PyQt5 import QtCore, QtGui, QtWidgets




class Ui_MainWindowIsld(object):
    def setupUi(self, MainWindow):
        MainWindow.setObjectName("MainWindow")
        MainWindow.resize(850, 673)
        MainWindow.setMinimumSize(QtCore.QSize(640, 480))
        font = QtGui.QFont()
        font.setPointSize(10)
        MainWindow.setFont(font)
        icon = QtGui.QIcon()
        icon.addPixmap(QtGui.QPixmap(":/images/icons/island128.png"), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        MainWindow.setWindowIcon(icon)
        MainWindow.setLocale(QtCore.QLocale(QtCore.QLocale.English, QtCore.QLocale.UnitedStates))
        self.centralWidget = QtWidgets.QWidget(MainWindow)
        self.centralWidget.setObjectName("centralWidget")
        self.verticalLayout_7 = QtWidgets.QVBoxLayout(self.centralWidget)
        self.verticalLayout_7.setContentsMargins(11, 11, 11, 11)
        self.verticalLayout_7.setSpacing(6)
        self.verticalLayout_7.setObjectName("verticalLayout_7")
        self.verticalLayout_6 = QtWidgets.QVBoxLayout()
        self.verticalLayout_6.setContentsMargins(20, 20, 20, 20)
        self.verticalLayout_6.setSpacing(5)
        self.verticalLayout_6.setObjectName("verticalLayout_6")
        self.horizontalLayout_7 = QtWidgets.QHBoxLayout()
        self.horizontalLayout_7.setSpacing(6)
        self.horizontalLayout_7.setObjectName("horizontalLayout_7")
        self.horizontalLayout_3 = QtWidgets.QHBoxLayout()
        self.horizontalLayout_3.setContentsMargins(25, 25, -1, -1)
        self.horizontalLayout_3.setSpacing(6)
        self.horizontalLayout_3.setObjectName("horizontalLayout_3")
        self.verticalLayout_3 = QtWidgets.QVBoxLayout()
        self.verticalLayout_3.setSpacing(6)
        self.verticalLayout_3.setObjectName("verticalLayout_3")
        self.label = QtWidgets.QLabel(self.centralWidget)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Fixed, QtWidgets.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.label.sizePolicy().hasHeightForWidth())
        self.label.setSizePolicy(sizePolicy)
        self.label.setText("")
        self.label.setPixmap(QtGui.QPixmap(":/images/icons/island256.png"))
        self.label.setScaledContents(True)
        self.label.setObjectName("label")
        self.verticalLayout_3.addWidget(self.label)
        self.horizontalLayout_3.addLayout(self.verticalLayout_3)
        self.horizontalLayout_7.addLayout(self.horizontalLayout_3)
        spacerItem = QtWidgets.QSpacerItem(40, 20, QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Minimum)
        self.horizontalLayout_7.addItem(spacerItem)
        self.verticalLayout_5 = QtWidgets.QVBoxLayout()
        self.verticalLayout_5.setSpacing(6)
        self.verticalLayout_5.setObjectName("verticalLayout_5")
        self.horizontalLayout_2 = QtWidgets.QHBoxLayout()
        self.horizontalLayout_2.setSizeConstraint(QtWidgets.QLayout.SetMaximumSize)
        self.horizontalLayout_2.setContentsMargins(-1, 2, -1, 24)
        self.horizontalLayout_2.setSpacing(9)
        self.horizontalLayout_2.setObjectName("horizontalLayout_2")
        self.islandStatusLabel = QtWidgets.QLabel(self.centralWidget)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Preferred, QtWidgets.QSizePolicy.Preferred)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.islandStatusLabel.sizePolicy().hasHeightForWidth())
        self.islandStatusLabel.setSizePolicy(sizePolicy)
        self.islandStatusLabel.setMaximumSize(QtCore.QSize(1965, 30))
        font = QtGui.QFont()
        font.setFamily("Arial")
        font.setPointSize(20)
        self.islandStatusLabel.setFont(font)
        self.islandStatusLabel.setStyleSheet("")
        self.islandStatusLabel.setScaledContents(False)
        self.islandStatusLabel.setAlignment(QtCore.Qt.AlignRight|QtCore.Qt.AlignTrailing|QtCore.Qt.AlignVCenter)
        self.islandStatusLabel.setObjectName("islandStatusLabel")
        self.horizontalLayout_2.addWidget(self.islandStatusLabel)
        self.islandStatus = QtWidgets.QLabel(self.centralWidget)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Fixed, QtWidgets.QSizePolicy.Preferred)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.islandStatus.sizePolicy().hasHeightForWidth())
        self.islandStatus.setSizePolicy(sizePolicy)
        self.islandStatus.setMaximumSize(QtCore.QSize(1965, 30))
        palette = QtGui.QPalette()
        brush = QtGui.QBrush(QtGui.QColor(173, 173, 173))
        brush.setStyle(QtCore.Qt.SolidPattern)
        palette.setBrush(QtGui.QPalette.Active, QtGui.QPalette.WindowText, brush)
        brush = QtGui.QBrush(QtGui.QColor(173, 173, 173))
        brush.setStyle(QtCore.Qt.SolidPattern)
        palette.setBrush(QtGui.QPalette.Inactive, QtGui.QPalette.WindowText, brush)
        brush = QtGui.QBrush(QtGui.QColor(120, 120, 120))
        brush.setStyle(QtCore.Qt.SolidPattern)
        palette.setBrush(QtGui.QPalette.Disabled, QtGui.QPalette.WindowText, brush)
        self.islandStatus.setPalette(palette)
        font = QtGui.QFont()
        font.setFamily("Arial")
        font.setPointSize(20)
        self.islandStatus.setFont(font)
        self.islandStatus.setStyleSheet("")
        self.islandStatus.setAlignment(QtCore.Qt.AlignRight|QtCore.Qt.AlignTrailing|QtCore.Qt.AlignVCenter)
        self.islandStatus.setObjectName("islandStatus")
        self.horizontalLayout_2.addWidget(self.islandStatus)
        self.verticalLayout_5.addLayout(self.horizontalLayout_2)
        self.horizontalLayout_6 = QtWidgets.QHBoxLayout()
        self.horizontalLayout_6.setContentsMargins(-1, 14, -1, 0)
        self.horizontalLayout_6.setSpacing(6)
        self.horizontalLayout_6.setObjectName("horizontalLayout_6")
        self.island_access_label = QtWidgets.QLabel(self.centralWidget)
        self.island_access_label.setLayoutDirection(QtCore.Qt.LeftToRight)
        self.island_access_label.setAlignment(QtCore.Qt.AlignRight|QtCore.Qt.AlignTrailing|QtCore.Qt.AlignVCenter)
        self.island_access_label.setObjectName("island_access_label")
        self.horizontalLayout_6.addWidget(self.island_access_label)
        self.island_access_address = QtWidgets.QLabel(self.centralWidget)
        font = QtGui.QFont()
        font.setUnderline(True)
        self.island_access_address.setFont(font)
        self.island_access_address.setStyleSheet("")
        self.island_access_address.setText("")
        self.island_access_address.setOpenExternalLinks(True)
        self.island_access_address.setObjectName("island_access_address")
        self.horizontalLayout_6.addWidget(self.island_access_address)
        self.verticalLayout_5.addLayout(self.horizontalLayout_6)
        self.horizontalLayout_8 = QtWidgets.QHBoxLayout()
        self.horizontalLayout_8.setContentsMargins(-1, -1, -1, 0)
        self.horizontalLayout_8.setSpacing(6)
        self.horizontalLayout_8.setObjectName("horizontalLayout_8")
        self.island_admin_access_address = QtWidgets.QLabel(self.centralWidget)
        font = QtGui.QFont()
        font.setUnderline(True)
        self.island_admin_access_address.setFont(font)
        self.island_admin_access_address.setLayoutDirection(QtCore.Qt.LeftToRight)
        self.island_admin_access_address.setStyleSheet("")
        self.island_admin_access_address.setText("")
        self.island_admin_access_address.setAlignment(QtCore.Qt.AlignRight|QtCore.Qt.AlignTrailing|QtCore.Qt.AlignVCenter)
        self.island_admin_access_address.setOpenExternalLinks(True)
        self.island_admin_access_address.setObjectName("island_admin_access_address")
        self.horizontalLayout_8.addWidget(self.island_admin_access_address)
        self.verticalLayout_5.addLayout(self.horizontalLayout_8)
        spacerItem1 = QtWidgets.QSpacerItem(20, 40, QtWidgets.QSizePolicy.Minimum, QtWidgets.QSizePolicy.Expanding)
        self.verticalLayout_5.addItem(spacerItem1)
        self.groupBox = QtWidgets.QGroupBox(self.centralWidget)
        self.groupBox.setEnabled(False)
        self.groupBox.setVisible(False)
        self.groupBox.setLayoutDirection(QtCore.Qt.RightToLeft)
        self.groupBox.setStyleSheet("")
        self.groupBox.setTitle("")
        self.groupBox.setAlignment(QtCore.Qt.AlignRight|QtCore.Qt.AlignTrailing|QtCore.Qt.AlignVCenter)
        self.groupBox.setObjectName("groupBox")
        self.verticalLayout = QtWidgets.QVBoxLayout(self.groupBox)
        self.verticalLayout.setContentsMargins(11, 11, 11, 11)
        self.verticalLayout.setSpacing(6)
        self.verticalLayout.setObjectName("verticalLayout")
        self.horizontalLayout_5 = QtWidgets.QHBoxLayout()
        self.horizontalLayout_5.setSpacing(6)
        self.horizontalLayout_5.setObjectName("horizontalLayout_5")
        self.setup_required_reason = QtWidgets.QLabel(self.groupBox)
        self.setup_required_reason.setObjectName("setup_required_reason")
        self.horizontalLayout_5.addWidget(self.setup_required_reason)
        self.setup_required_icon = QtWidgets.QLabel(self.groupBox)
        self.setup_required_icon.setMaximumSize(QtCore.QSize(16, 16))
        self.setup_required_icon.setText("")
        self.setup_required_icon.setPixmap(QtGui.QPixmap(":/images/info"))
        self.setup_required_icon.setScaledContents(True)
        self.setup_required_icon.setObjectName("setup_required_icon")
        self.horizontalLayout_5.addWidget(self.setup_required_icon)
        self.verticalLayout.addLayout(self.horizontalLayout_5)
        self.horizontalLayout = QtWidgets.QHBoxLayout()
        self.horizontalLayout.setContentsMargins(-1, -1, 0, 0)
        self.horizontalLayout.setSpacing(0)
        self.horizontalLayout.setObjectName("horizontalLayout")
        self.button_launch_setup = QtWidgets.QPushButton(self.groupBox)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.button_launch_setup.sizePolicy().hasHeightForWidth())
        self.button_launch_setup.setSizePolicy(sizePolicy)
        self.button_launch_setup.setLayoutDirection(QtCore.Qt.LeftToRight)
        self.button_launch_setup.setStyleSheet("width: 120px; height: 30px")
        icon1 = QtGui.QIcon()
        icon1.addPixmap(QtGui.QPixmap(":/images/gear"), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        self.button_launch_setup.setIcon(icon1)
        self.button_launch_setup.setObjectName("button_launch_setup")
        self.horizontalLayout.addWidget(self.button_launch_setup)
        spacerItem2 = QtWidgets.QSpacerItem(40, 20, QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Minimum)
        self.horizontalLayout.addItem(spacerItem2)
        self.verticalLayout.addLayout(self.horizontalLayout)
        self.verticalLayout_5.addWidget(self.groupBox)
        self.horizontalLayout_7.addLayout(self.verticalLayout_5)
        self.verticalLayout_6.addLayout(self.horizontalLayout_7)
        spacerItem3 = QtWidgets.QSpacerItem(20, 40, QtWidgets.QSizePolicy.Minimum, QtWidgets.QSizePolicy.Expanding)
        self.verticalLayout_6.addItem(spacerItem3)
        self.horizontalLayout_4 = QtWidgets.QHBoxLayout()
        self.horizontalLayout_4.setSpacing(6)
        self.horizontalLayout_4.setObjectName("horizontalLayout_4")
        self.verticalLayout_2 = QtWidgets.QVBoxLayout()
        self.verticalLayout_2.setSpacing(6)
        self.verticalLayout_2.setObjectName("verticalLayout_2")
        self.launchIslandButton = QtWidgets.QPushButton(self.centralWidget)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Minimum, QtWidgets.QSizePolicy.Preferred)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.launchIslandButton.sizePolicy().hasHeightForWidth())
        self.launchIslandButton.setSizePolicy(sizePolicy)
        icon2 = QtGui.QIcon()
        icon2.addPixmap(QtGui.QPixmap(":/images/play"), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        self.launchIslandButton.setIcon(icon2)
        self.launchIslandButton.setIconSize(QtCore.QSize(48, 48))
        self.launchIslandButton.setAutoDefault(False)
        self.launchIslandButton.setObjectName("launchIslandButton")
        self.verticalLayout_2.addWidget(self.launchIslandButton)
        self.launchMode = QtWidgets.QComboBox(self.centralWidget)
        self.launchMode.setObjectName("launchMode")
        self.launchMode.addItem("")
        self.launchMode.addItem("")
        self.verticalLayout_2.addWidget(self.launchMode)
        self.horizontalLayout_4.addLayout(self.verticalLayout_2)
        self.verticalLayout_4 = QtWidgets.QVBoxLayout()
        self.verticalLayout_4.setSpacing(6)
        self.verticalLayout_4.setObjectName("verticalLayout_4")
        self.shutdownIslandButton = QtWidgets.QPushButton(self.centralWidget)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Minimum, QtWidgets.QSizePolicy.Preferred)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.shutdownIslandButton.sizePolicy().hasHeightForWidth())
        self.shutdownIslandButton.setSizePolicy(sizePolicy)
        self.shutdownIslandButton.setStyleSheet("padding: 15px")
        icon3 = QtGui.QIcon()
        icon3.addPixmap(QtGui.QPixmap(":/images/stop"), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        self.shutdownIslandButton.setIcon(icon3)
        self.shutdownIslandButton.setIconSize(QtCore.QSize(48, 48))
        self.shutdownIslandButton.setObjectName("shutdownIslandButton")
        self.verticalLayout_4.addWidget(self.shutdownIslandButton)
        self.stopMode = QtWidgets.QComboBox(self.centralWidget)
        self.stopMode.setObjectName("stopMode")
        self.stopMode.addItem("")
        self.stopMode.addItem("")
        self.verticalLayout_4.addWidget(self.stopMode)
        self.horizontalLayout_4.addLayout(self.verticalLayout_4)
        self.restartIslandButton = QtWidgets.QPushButton(self.centralWidget)
        sizePolicy = QtWidgets.QSizePolicy(QtWidgets.QSizePolicy.Minimum, QtWidgets.QSizePolicy.Preferred)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.restartIslandButton.sizePolicy().hasHeightForWidth())
        self.restartIslandButton.setSizePolicy(sizePolicy)
        self.restartIslandButton.setStyleSheet("padding: 20px;")
        icon4 = QtGui.QIcon()
        icon4.addPixmap(QtGui.QPixmap(":/images/reload"), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        self.restartIslandButton.setIcon(icon4)
        self.restartIslandButton.setIconSize(QtCore.QSize(48, 48))
        self.restartIslandButton.setObjectName("restartIslandButton")
        self.horizontalLayout_4.addWidget(self.restartIslandButton)
        self.verticalLayout_6.addLayout(self.horizontalLayout_4)
        self.verticalLayout_7.addLayout(self.verticalLayout_6)
        MainWindow.setCentralWidget(self.centralWidget)
        self.menuBar = QtWidgets.QMenuBar(MainWindow)
        self.menuBar.setGeometry(QtCore.QRect(0, 0, 850, 21))
        self.menuBar.setObjectName("menuBar")
        self.menuOptions = QtWidgets.QMenu(self.menuBar)
        self.menuOptions.setObjectName("menuOptions")
        self.menuTools = QtWidgets.QMenu(self.menuBar)
        self.menuTools.setObjectName("menuTools")
        self.menuKeys = QtWidgets.QMenu(self.menuBar)
        self.menuKeys.setObjectName("menuKeys")
        self.menuConfig = QtWidgets.QMenu(self.menuBar)
        self.menuConfig.setObjectName("menuConfig")
        MainWindow.setMenuBar(self.menuBar)
        self.statusBar = QtWidgets.QStatusBar(MainWindow)
        self.statusBar.setLocale(QtCore.QLocale(QtCore.QLocale.English, QtCore.QLocale.UnitedStates))
        self.statusBar.setObjectName("statusBar")
        MainWindow.setStatusBar(self.statusBar)
        self.actionExit = QtWidgets.QAction(MainWindow)
        self.actionExit.setIconVisibleInMenu(True)
        self.actionExit.setObjectName("actionExit")
        self.actionMinimize = QtWidgets.QAction(MainWindow)
        self.actionMinimize.setIconVisibleInMenu(True)
        self.actionMinimize.setObjectName("actionMinimize")
        self.actionAbout = QtWidgets.QAction(MainWindow)
        self.actionAbout.setIconVisibleInMenu(True)
        self.actionAbout.setObjectName("actionAbout")
        self.actionInfo = QtWidgets.QAction(MainWindow)
        self.actionInfo.setObjectName("actionInfo")
        self.actionMinimize_2 = QtWidgets.QAction(MainWindow)
        self.actionMinimize_2.setObjectName("actionMinimize_2")
        self.actionClose = QtWidgets.QAction(MainWindow)
        self.actionClose.setObjectName("actionClose")
        self.act_islandsimage_authoring = QtWidgets.QAction(MainWindow)
        self.act_islandsimage_authoring.setObjectName("act_islandsimage_authoring")
        self.act_my_torrents = QtWidgets.QAction(MainWindow)
        self.act_my_torrents.setObjectName("act_my_torrents")
        self.act_trusted_keys = QtWidgets.QAction(MainWindow)
        self.act_trusted_keys.setObjectName("act_trusted_keys")
        self.act_my_keys = QtWidgets.QAction(MainWindow)
        self.act_my_keys.setObjectName("act_my_keys")
        self.act_open_config = QtWidgets.QAction(MainWindow)
        self.act_open_config.setObjectName("act_open_config")
        self.act_update_vm = QtWidgets.QAction(MainWindow)
        self.act_update_vm.setObjectName("act_update_vm")
        self.menuOptions.addAction(self.actionInfo)
        self.menuOptions.addSeparator()
        self.menuOptions.addAction(self.actionMinimize_2)
        self.menuOptions.addAction(self.actionClose)
        self.menuTools.addAction(self.act_islandsimage_authoring)
        self.menuTools.addAction(self.act_my_torrents)
        self.menuKeys.addAction(self.act_trusted_keys)
        self.menuKeys.addAction(self.act_my_keys)
        self.menuConfig.addAction(self.act_open_config)
        self.menuConfig.addSeparator()
        self.menuConfig.addAction(self.act_update_vm)
        self.menuBar.addAction(self.menuOptions.menuAction())
        self.menuBar.addAction(self.menuTools.menuAction())
        self.menuBar.addAction(self.menuKeys.menuAction())
        self.menuBar.addAction(self.menuConfig.menuAction())

        self.retranslateUi(MainWindow)
        QtCore.QMetaObject.connectSlotsByName(MainWindow)

    def retranslateUi(self, MainWindow):
        _translate = QtCore.QCoreApplication.translate
        MainWindow.setWindowTitle(_translate("MainWindow", "Island Manager"))
        self.islandStatusLabel.setText(_translate("MainWindow", "Island status: "))
        self.islandStatus.setText(_translate("MainWindow", "unknown"))
        self.island_access_label.setText(_translate("MainWindow", "Access:"))
        self.setup_required_reason.setText(_translate("MainWindow", "Island VM not found"))
        self.button_launch_setup.setText(_translate("MainWindow", "Run setup"))
        self.launchIslandButton.setWhatsThis(_translate("MainWindow", "<html><head/><body><p>Launch island. </p></body></html>"))
        self.launchIslandButton.setText(_translate("MainWindow", "Launch Island"))
        self.launchMode.setItemText(0, _translate("MainWindow", "Quiet"))
        self.launchMode.setItemText(1, _translate("MainWindow", "Normal"))
        self.shutdownIslandButton.setText(_translate("MainWindow", "Shutdown Island"))
        self.stopMode.setItemText(0, _translate("MainWindow", "Soft"))
        self.stopMode.setItemText(1, _translate("MainWindow", "Force"))
        self.restartIslandButton.setText(_translate("MainWindow", "Restart Island"))
        self.menuOptions.setTitle(_translate("MainWindow", "Menu"))
        self.menuTools.setTitle(_translate("MainWindow", "Tools"))
        self.menuKeys.setTitle(_translate("MainWindow", "Keys"))
        self.menuConfig.setTitle(_translate("MainWindow", "Config"))
        self.actionExit.setText(_translate("MainWindow", "Exit"))
        self.actionMinimize.setText(_translate("MainWindow", "Minimize"))
        self.actionAbout.setText(_translate("MainWindow", "About"))
        self.actionInfo.setText(_translate("MainWindow", "Info"))
        self.actionMinimize_2.setText(_translate("MainWindow", "Minimize"))
        self.actionClose.setText(_translate("MainWindow", "Close"))
        self.act_islandsimage_authoring.setText(_translate("MainWindow", "Islands Image Authoring"))
        self.act_my_torrents.setText(_translate("MainWindow", "My torrents"))
        self.act_trusted_keys.setText(_translate("MainWindow", "Trusted keys"))
        self.act_my_keys.setText(_translate("MainWindow", "My keys"))
        self.act_open_config.setText(_translate("MainWindow", "Open configuration..."))
        self.act_update_vm.setText(_translate("MainWindow", "Update Islands VM..."))




class Ui_MainWindow(object):
    def setupUi(self, MainWindow):
        MainWindow.setObjectName("MainWindow")
        MainWindow.resize(413, 284)
        self.centralwidget = QtWidgets.QWidget(MainWindow)
        self.centralwidget.setObjectName("centralwidget")
        self.pushButton = QtWidgets.QPushButton(self.centralwidget)
        self.pushButton.setGeometry(QtCore.QRect(120, 80, 113, 32))
        self.pushButton.setObjectName("pushButton")
        MainWindow.setCentralWidget(self.centralwidget)
        self.menubar = QtWidgets.QMenuBar(MainWindow)
        self.menubar.setGeometry(QtCore.QRect(0, 0, 413, 22))
        self.menubar.setObjectName("menubar")
        MainWindow.setMenuBar(self.menubar)
        self.statusbar = QtWidgets.QStatusBar(MainWindow)
        self.statusbar.setObjectName("statusbar")
        MainWindow.setStatusBar(self.statusbar)

        self.retranslateUi(MainWindow)
        QtCore.QMetaObject.connectSlotsByName(MainWindow)

    def retranslateUi(self, MainWindow):
        _translate = QtCore.QCoreApplication.translate
        MainWindow.setWindowTitle(_translate("MainWindow", "MainWindow"))
        self.pushButton.setText(_translate("MainWindow", "Show dialog"))

class Ui_Dialog(object):
    def setupUi(self, Dialog):
        Dialog.setObjectName("Dialog")
        Dialog.resize(400, 300)
        self.pushButton = QtWidgets.QPushButton(Dialog)
        self.pushButton.setGeometry(QtCore.QRect(130, 160, 113, 32))
        self.pushButton.setObjectName("pushButton")

        self.retranslateUi(Dialog)
        QtCore.QMetaObject.connectSlotsByName(Dialog)

    def retranslateUi(self, Dialog):
        _translate = QtCore.QCoreApplication.translate
        Dialog.setWindowTitle(_translate("Dialog", "Dialog"))
        self.pushButton.setText(_translate("Dialog", "Ask Question"))


class SomeDialog:
    def __init__(self, parent=None):
        self.window = QDialog(parent)
        self.ui = Ui_Dialog()
        self.ui.setupUi(self.window)
        self.ui.pushButton.clicked.connect(self.ask_question)

    def ask_question(self):
        QM.question(self.window, "Question", "Are you good?", QM.Yes | QM.No)



    def exec(self):
        self.window.exec()

class MainWindow:
    def __init__(self):
        self.window = QMainWindow()
        self.ui = Ui_MainWindowIsld()
        self.ui.setupUi(self.window)
        self.ui.restartIslandButton.clicked.connect(self.ask_question)
        self.ui.launchIslandButton.clicked.connect(self.show_another_dialog)

    def show_another_dialog(self):
        dialog = SomeDialog(self.window)
        dialog.exec()

    def ask_question(self):
        QM.question(self.window, "Question", "Are you good?", QM.Yes | QM.No)

    def show(self):
        self.window.show()


class App:
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.main_window = MainWindow()

    def run(self):
        self.main_window.show()
        self.app.exec_()


def main():
    app = App()
    app.run()

if __name__ == "__main__":
    main()
