import { MigrationPathsForSchema, Property, SchemaFieldType } from "@trust0/ridb-core";
import SDK from '@hyperledger/identus-sdk';

const collections = SDK.makeCollections();

type Collections = {
    [key in keyof typeof collections]: typeof collections[key]
};
type CollectionSchemas = {
    [key in keyof Collections]: {
        version: Collections[key]['schema']['version'];
        primaryKey: Collections[key]['schema']['primaryKey'];
        type: Collections[key]['schema']['type'];
        encrypted?: 'encrypted' extends keyof Collections[key]['schema'] ? Collections[key]['schema']['encrypted'] : never;
        properties: Collections[key]['schema']['properties'];
    };
}


type CollectionSchema = CollectionSchemas[keyof CollectionSchemas];

function migrateSchema<
    T extends CollectionSchema,
    P extends Record<string, Property>
>({ properties: schemaProperties, ...schemaWithoutProperties }: T, additionalProperties: P) {
    const schema = {
        ...schemaWithoutProperties,
        version: 0 as const,
        encrypted: schemaWithoutProperties.encrypted || [],
        properties: Object.fromEntries(
            Object.entries({
                ...schemaProperties,
                ...additionalProperties
            }).map(([key, value]) => {
                const propValue: any = { ...value };
                propValue.required = propValue?.required === true;
                propValue.maxLength = undefined;
                return [key, propValue];
            })
        ) as T['properties'] & P
    }
    return schema;
}

function extractSchemas<T extends Record<string, { schema: CollectionSchema }>>(collections: T) {
    const result = {} as {
        [K in keyof T]: Omit<T[K]['schema'], 'version'> & { version: 0 }
    };
    for (const key in collections) {
        if (Object.prototype.hasOwnProperty.call(collections, key)) {
            (result as any)[key] = migrateSchema(collections[key].schema, {});
        }
    }
    return result;
}

function extractMigrations<T extends Record<string, { schema: CollectionSchema, migrationStrategies?: MigrationPathsForSchema<CollectionSchema> }>>(collections: T) {
    const result = {} as {
        [K in keyof T]: MigrationPathsForSchema<T[K]['schema']>
    };
    for (const key in collections) {
        if (Object.prototype.hasOwnProperty.call(collections, key)) {
            (result as any)[key] = migrateSchema(collections[key].schema, {});
        }
    }
    return result;
}

export const schemas = {
    ...extractSchemas(collections),
    messages: migrateSchema(collections.messages.schema, {
    read: {
        type: SchemaFieldType.boolean,
        default: false as const,
        required: true as const
    },
}),}
export const migrations = extractMigrations(collections)