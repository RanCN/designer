/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { Vector3 } from 'three';
import { Position } from '../position';
import { ScenarioEntity } from '../entities/scenario-entity';
import { ConditionCategory, Rule, TriggeringRule } from '../tv-enums';
import { Condition } from './tv-condition';

export abstract class EntityCondition extends Condition {

	public category: ConditionCategory = ConditionCategory.ByEntity;

	public triggeringRule: TriggeringRule = TriggeringRule.Any;

	// name of all entities which can affect this condition
	public triggeringEntities: string[] = [];

	protected isTriggerRulePassing ( values: number[], rule: Rule, right: number ) {

		switch ( this.triggeringRule ) {

			case TriggeringRule.Any:
				return values.some( left => this.hasRulePassed( rule, left, right ) );

			case TriggeringRule.All:
				return values.every( left => this.hasRulePassed( rule, left, right ) );

			default:
				return false;
		}

	}

	protected getEntity ( entityName: string ): ScenarioEntity {

		return this.scenario.findEntityOrFail( entityName );

	}


	public addTriggeringEntity ( entityName: string ) {

		this.triggeringEntities.push( entityName );

	}

	protected getEntityPosition ( entityName: string ): Vector3 {

		return this.scenario.getEntityVectorPosition( entityName );

	}

	protected getEntitySpeed ( entityName: string ): number {

		return this.scenario.findEntityOrFail( entityName ).getCurrentSpeed();

	}

	protected getTravelledDistance ( entityName: string ): number {

		throw new Error( 'Not implemented' );

	}

	protected calculateDistance ( entityName: string, position: Position, freespace: boolean ) {

		if ( !freespace ) {

			// This function should return the current position of the entity with the given name
			const entityPosition = this.getEntityPosition( entityName );

			// For free space distance, calculate the Euclidean distance from the entity to the position
			return entityPosition.distanceTo( position.toVector3() );

		} else {

			throw new Error( 'Not implemented' );

			// For alongRoute, calculate the distance traveled along the route
			// This can be complex and would require information about the route,
			// which is not provided in this example. As a placeholder, we use a fixed value.
			// return this.getTravelledDistance( entityName );  // This function should return the total distance traveled by the entity along the route
		}

	}

	setTriggeringRule ( rule: TriggeringRule ): void {
		this.triggeringRule = rule;
	}
}
