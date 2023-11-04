/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { Injectable } from '@angular/core';
import { AssetLoaderService } from 'app/core/asset/asset-loader.service';
import { FileService } from 'app/io/file.service';
import { SceneExporterService } from 'app/services/scene-exporter.service';
import { TvElectronService } from 'app/services/tv-electron.service';

import { ViewportEvents } from '../events/viewport-events';
import { ThreeService } from '../modules/three-js/three.service';
import { SnackBar } from './snack-bar.service';
import { AppInfo } from './app-info.service';
import { AuthService } from './auth.service';
import { EditorService } from './editor.service';
import { SceneService } from './scene.service';
import { ManagerRegistry } from '../managers/manager-registry';
import { JunctionManager } from '../managers/junction-manager';
import { RoadManager } from '../managers/road-manager';
import { EntityManager } from '../managers/entity-manager';
import { LaneManager } from '../managers/lane-manager';
import { MapManager } from '../managers/map-manager';
import { ElevationManager } from '../managers/elevation-manager';

@Injectable( {
	providedIn: 'root'
} )
export class AppService {

	static homeUrl = '';
	static loginUrl = '/sessions/signin';

	static eventSystem: ViewportEvents;
	static three: ThreeService;
	static electron: TvElectronService;
	static assets: AssetLoaderService;
	static file: FileService;
	static exporter: SceneExporterService;
	static editor: EditorService;

	constructor (
		private eventSystem: ViewportEvents,
		private electron: TvElectronService,
		private scene: SceneService,
		private snackBar: SnackBar,
		private three: ThreeService,
		public auth: AuthService,
		public assets: AssetLoaderService,
		public files: FileService,
		sceneExporter: SceneExporterService,
		public editor: EditorService,
	) {


		AppService.eventSystem = eventSystem;
		AppService.three = three;
		AppService.electron = electron;
		AppService.assets = assets;
		AppService.file = files;
		AppService.editor = editor;

		AppService.exporter = sceneExporter;

		AppInfo.electron = electron;

		ManagerRegistry.registerManager( RoadManager );
		ManagerRegistry.registerManager( JunctionManager );
		ManagerRegistry.registerManager( EntityManager );
		ManagerRegistry.registerManager( LaneManager );
		ManagerRegistry.registerManager( MapManager );
		ManagerRegistry.registerManager( ElevationManager );

		ManagerRegistry.initManagers();
	}

	static get isElectronApp (): boolean {

		return this.electron.isElectronApp;

	}

	public exit () {

		this.files.remote.app.exit( 0 );

	}

}
