//
//  ViewController.swift
//  Browser Phone
//
//  Created by Conrad de Wet on 2022/01/18.
//

import UIKit
import SafariServices

class ViewController: UIViewController {
    @IBOutlet weak var launchButton: UIButton!
    
    @IBAction func LaunchPhone(_ sender: UIButton) {
        let url = URL(string: "https://www.innovateasterisk.com/phone/")!
        let config = SFSafariViewController.Configuration()
        config.entersReaderIfAvailable = false;
        config.barCollapsingEnabled = true;
        
        let svc = SFSafariViewController(url: url, configuration: config)
        svc.preferredBarTintColor = UIColor(red: 34.0/255.0, green: 34.0/255.0, blue: 34.0/255.0, alpha: 1) // #222222
        svc.preferredControlTintColor = UIColor.lightGray
        svc.dismissButtonStyle = (SFSafariViewController.DismissButtonStyle.close)

        self.present(svc, animated: false, completion: nil)
    }
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
    }
    override func viewDidAppear(_ animated: Bool) {
        launchButton.sendActions(for: UIControl.Event.touchUpInside)
    }

}

