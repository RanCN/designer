/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { AppService } from '../services/app.service';
import { BaseShortcut } from './base-shortcut';

export class NewFileShortcut extends BaseShortcut {

	check ( e: KeyboardEvent ): boolean {

		return e.ctrlKey == true && e.key === 'n';

	}

	execute (): void {

		AppService.editor.newFile();

	}

}
