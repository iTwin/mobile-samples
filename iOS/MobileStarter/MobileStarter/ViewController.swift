//---------------------------------------------------------------------------------------
//
//     $Source: $
//
//  $Copyright: (c) 2021 Bentley Systems, Incorporated. All rights reserved. $
//
//---------------------------------------------------------------------------------------

import ITwinMobile

class ViewController: ITMViewController {
    override class func createApplication() -> ITMApplication {
        return ModelApplication()
    }
}
