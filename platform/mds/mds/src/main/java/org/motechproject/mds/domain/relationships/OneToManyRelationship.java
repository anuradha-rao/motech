package org.motechproject.mds.domain.relationships;

import org.motechproject.mds.domain.EntityType;
import org.motechproject.mds.domain.Field;
import org.motechproject.mds.javassist.JavassistHelper;

import java.util.List;

/**
 * A specialization of the {@link org.motechproject.mds.domain.relationships.Relationship} class.
 * Represents a one-to-many relationship.
 */
public class OneToManyRelationship extends Relationship {

    @Override
    public String getFieldType(Field field, EntityType type) {
        return List.class.getName();
    }

    @Override
    public String getGenericSignature(Field field, EntityType type) {
        return JavassistHelper.genericSignature(List.class, getRelatedClassName(field, type));
    }
}