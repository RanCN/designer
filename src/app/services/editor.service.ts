/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { Injectable } from '@angular/core';
import { FileService } from 'app/io/file.service';
import { MainFileService } from 'app/services/main-file.service';
import { KeyboardInput } from '../core/input';
// import { ShortcutService } from './shortcut.service';

@Injectable( {
	providedIn: 'root'
} )
export class EditorService {

	constructor (
		// private shortcutService: ShortcutService,
		private mainFileService: MainFileService,
		public settings: EditorSettings
	) {
	}

	newFile () {

		this.mainFileService.newScene();

	}

	save () {

		this.mainFileService.save();

	}

	saveAs () {

		this.mainFileService.saveAs();

	}

	onKeyDown ( e: KeyboardEvent ) {
		// fire the event for the whole application
		KeyboardInput.OnKeyDown( e );

		// handle shortcuts
		// ShortcutService.handleKeyDown( e );

	}

	onKeyUp ( e: KeyboardEvent ) {

		// fire the event for the whole application
		KeyboardInput.OnKeyUp( e );

	}

}

@Injectable( {
	providedIn: 'root',
} )
export class EditorSettings {

	private settings = {};

	constructor (  ) {

	}

	get esminiEnabled (): boolean {
		return this.settings[ 'esminiEnabled' ] == 'true' || this.settings[ 'esminiEnabled' ] == true;
	}

	set esminiEnabled ( value: boolean ) {
		this.setSetting( 'esminiEnabled', value );
	}

	get esminiPath (): string {
		return this.settings[ 'esminiPath' ];
	}

	set esminiPath ( value: string ) {
		this.setSetting( 'esminiPath', value );
	}

	get odrViewerPath (): string {
		return this.settings[ 'odrViewerPath' ];
	}

	set odrViewerPath ( value: string ) {
		this.setSetting( 'odrViewerPath', value );
	}

	getSetting ( key: string ): any {
		return this.settings[ key ];
	}

	setSetting ( key: string, value: any ) {
		this.settings[ key ] = value;
	}

}



