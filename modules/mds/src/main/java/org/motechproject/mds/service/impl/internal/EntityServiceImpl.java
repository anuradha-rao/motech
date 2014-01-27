package org.motechproject.mds.service.impl.internal;

import org.apache.commons.lang.StringUtils;
import org.motechproject.mds.domain.AvailableFieldTypeMapping;
import org.motechproject.mds.domain.EntityDraft;
import org.motechproject.mds.domain.EntityMapping;
import org.motechproject.mds.domain.FieldMapping;
import org.motechproject.mds.domain.LookupMapping;
import org.motechproject.mds.dto.AdvancedSettingsDto;
import org.motechproject.mds.dto.AvailableTypeDto;
import org.motechproject.mds.dto.EntityDto;
import org.motechproject.mds.dto.FieldBasicDto;
import org.motechproject.mds.dto.FieldDto;
import org.motechproject.mds.dto.FieldInstanceDto;
import org.motechproject.mds.dto.FieldValidationDto;
import org.motechproject.mds.dto.SecuritySettingsDto;
import org.motechproject.mds.dto.SettingDto;
import org.motechproject.mds.dto.TypeDto;
import org.motechproject.mds.ex.EntityAlreadyExistException;
import org.motechproject.mds.ex.EntityNotFoundException;
import org.motechproject.mds.ex.EntityReadOnlyException;
import org.motechproject.mds.ex.FieldNotFoundException;
import org.motechproject.mds.ex.NoSuchTypeException;
import org.motechproject.mds.repository.AllEntityDrafts;
import org.motechproject.mds.repository.AllEntityMappings;
import org.motechproject.mds.repository.AllFieldTypes;
import org.motechproject.mds.service.BaseMdsService;
import org.motechproject.mds.service.EntityService;
import org.motechproject.mds.service.MDSConstructor;
import org.motechproject.mds.util.FieldHelper;
import org.motechproject.mds.web.DraftData;
import org.motechproject.mds.web.ExampleData;
import org.motechproject.mds.web.domain.EntityRecord;
import org.motechproject.mds.web.domain.HistoryRecord;
import org.motechproject.mds.web.domain.PreviousRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static org.motechproject.mds.constants.Constants.Packages;

/**
 * Default implementation of {@link org.motechproject.mds.service.EntityService} interface.
 */
@Service
public class EntityServiceImpl extends BaseMdsService implements EntityService {
    private AllEntityMappings allEntityMappings;
    private MDSConstructor constructor;
    private AllFieldTypes allFieldTypes;
    private AllEntityDrafts allEntityDrafts;

    // TODO remove this once everything is in db
    private ExampleData exampleData = new ExampleData();

    @Override
    @Transactional
    public EntityDto createEntity(EntityDto entity) throws IOException {
        if (entity.isReadOnly()) {
            throw new EntityReadOnlyException();
        }

        if (allEntityMappings.containsEntity(entity.getName())) {
            throw new EntityAlreadyExistException();
        }

        String className = String.format("%s.%s", Packages.ENTITY, entity.getName());
        EntityMapping entityMapping = allEntityMappings.save(className);
        constructor.constructEntity(entityMapping);

        return entityMapping.toDto();
    }

    @Override
    @Transactional
    public boolean saveDraftEntityChanges(Long entityId, DraftData draftData) {
        exampleData.draft(entityId, draftData);
        EntityDraft draft = getEntityDraft(entityId);

        if (draftData.isCreate()) {
            createFieldForDraft(draft, draftData);
        } else if (draftData.isEdit()) {
            draftEdit(draft, draftData);
        } else if (draftData.isRemove()) {
            draftRemove(draft, draftData);
        }

        return draft.getChangesMade();
    }

    private void editFieldForDraft(EntityDraft draft, DraftData draftData) {
        String fieldIdStr = draftData.getValue(DraftData.FIELD_ID).toString();

        if (StringUtils.isNotBlank(fieldIdStr)) {
            Long fieldId = Long.valueOf(fieldIdStr);
            FieldMapping field = draft.getField(fieldId);

            if (field != null) {
                String[] path = draftData.getValue(DraftData.PATH).toString().split("\\.");
                List value = (List) draftData.getValue(DraftData.VALUE);

                // Convert to dto for UI updates
                FieldDto dto = field.toDto();
                FieldHelper.setField(dto, path[path.length - 1], value);

                // Perform update
                field.update(dto);
                allEntityDrafts.save(draft);
            }
        }
    }

    private void createAdvancedForDraft(EntityDraft draft, DraftData draftData) {
        if (draftData.getValue(DraftData.PATH).equals(DraftData.ADD_NEW_INDEX)) {
            LookupMapping lookupMapping = new LookupMapping("New lookup name", true, draft);
            draft.addLookup(lookupMapping);
        } else if (draftData.getValue(DraftData.PATH).equals(DraftData.REMOVE_INDEX)) {
            StringBuilder sb = new StringBuilder(draftData.getValue(DraftData.VALUE).toString());
            LookupMapping lookup = draft.getLookups().get(Integer.valueOf(sb.substring(1, sb.length() - 1)));
            draft.removeLookup(lookup.getId());
        }
        allEntityDrafts.save(draft);
    }

    private void createFieldForDraft(EntityDraft draft, DraftData draftData) {
        String typeClass = draftData.getValue(DraftData.TYPE_CLASS).toString();
        String displayName = draftData.getValue(DraftData.DISPLAY_NAME).toString();
        String name = draftData.getValue(DraftData.NAME).toString();

        FieldBasicDto basic = new FieldBasicDto();
        basic.setName(name);
        basic.setDisplayName(displayName);

        AvailableFieldTypeMapping availableType = allFieldTypes.getByClassName(typeClass);
        if (availableType == null) {
            throw new NoSuchTypeException();
        }

        AvailableTypeDto availableTypeDto = availableType.toDto();
        TypeDto fieldType = availableTypeDto.getType();
        // TODO move to db
        List<SettingDto> fieldSettings = exampleData.getTypeSettings(fieldType);
        // TODO move to db
        FieldValidationDto fieldValidation = exampleData.getFieldValidationForType(fieldType);

        FieldDto field = new FieldDto();
        field.setBasic(basic);
        field.setType(fieldType);
        field.setValidation(fieldValidation);
        field.setSettings(fieldSettings);
        field.setSettings(fieldSettings);

        FieldMapping fieldMapping = new FieldMapping(field, draft, availableType);

        draft.addField(fieldMapping);

        allEntityDrafts.save(draft);
    }

    private void draftEdit(EntityDraft draft, DraftData draftData) {
        if (draftData.getType().equals(DraftData.ADVANCED)) {
            createAdvancedForDraft(draft, draftData);
        } else if (draftData.getType().equals(DraftData.FIELD)) {
            editFieldForDraft(draft, draftData);
        }
    }

    private void draftRemove(EntityDraft draft, DraftData draftData) {
        Long fieldId = Long.valueOf(draftData.getValue(DraftData.FIELD_ID).toString());
        draft.removeField(fieldId);
        allEntityDrafts.save(draft);
    }


    @Override
    @Transactional
    public void abandonChanges(Long entityId) {
        EntityDraft draft = getEntityDraft(entityId);
        if (draft != null) {
            allEntityDrafts.delete(draft);
        }
    }

    @Override
    @Transactional
    public void commitChanges(Long entityId) {
        EntityDraft draft = getEntityDraft(entityId);
        EntityMapping parent = draft.getParentEntity();

        parent.updateFromDraft(draft);

        allEntityDrafts.delete(draft);
    }


    @Override
    @Transactional
    public List<EntityDto> listWorkInProgress() {
        String username = getUsername();

        if (username == null) {
            throw new AccessDeniedException("Cannot retrieve work in progress - no user");
        }

        List<EntityDraft> drafts = allEntityDrafts.getAllUserDrafts(username);

        List<EntityDto> entityDtoList = new ArrayList<>();
        for (EntityDraft draft : drafts) {
            entityDtoList.add(draft.toDto());
        }

        return entityDtoList;
    }

    @Override
    @Transactional
    public List<EntityRecord> getEntityRecords(Long entityId) {
        return exampleData.getEntityRecordsById(entityId);
    }

    @Override
    @Transactional
    public AdvancedSettingsDto getAdvancedSettings(Long entityId) {
        EntityMapping entity = getEntityDraft(entityId);
        List<LookupMapping> lookups = entity.getLookups();
        AdvancedSettingsDto advancedSettings = exampleData.getAdvanced(entityId);
        advancedSettings.getIndexes().clear();
        for (LookupMapping lookup : lookups) {
            advancedSettings.getIndexes().add(lookup.toDto());
        }

        return advancedSettings;
    }

    @Override
    @Transactional
    public SecuritySettingsDto getSecuritySettings(Long entityId) {
        return exampleData.getSecurity(entityId);
    }

    @Override
    @Transactional
    public List<FieldInstanceDto> getInstanceFields(Long instanceId) {
        return exampleData.getInstanceFields(instanceId);
    }

    @Override
    @Transactional
    public List<HistoryRecord> getInstanceHistory(Long instanceId) {
        return exampleData.getInstanceHistoryRecordsById(instanceId);
    }

    @Override
    @Transactional
    public List<PreviousRecord> getPreviousRecords(Long instanceId) {
        return exampleData.getPreviousRecordsById(instanceId);
    }

    @Override
    @Transactional
    public void deleteEntity(Long entityId) {
        EntityMapping entity = allEntityMappings.getEntityById(entityId);

        if (entity == null) {
            throw new EntityNotFoundException();
        } else if (entity.isReadOnly()) {
            throw new EntityReadOnlyException();
        }

        if (entity.isDraft()) {
            entity = ((EntityDraft) entity).getParentEntity();
        }

        allEntityMappings.delete(entity);
    }

    @Override
    @Transactional
    public List<EntityDto> listEntities() {
        List<EntityDto> entityDtos = new ArrayList<>();

        for (EntityMapping entity : allEntityMappings.getAllEntities()) {
            if (!entity.isDraft()) {
                entityDtos.add(entity.toDto());
            }
        }

        return entityDtos;
    }

    @Override
    @Transactional
    public EntityDto getEntity(Long entityId) {
        EntityMapping entity = allEntityMappings.getEntityById(entityId);
        return (entity == null) ? null : entity.toDto();
    }

    @Override
    @Transactional
    public List<FieldDto> getFields(Long entityId) {
        EntityMapping entity = getEntityDraft(entityId);

        List<FieldMapping> fields = entity.getFields();

        List<FieldDto> fieldDtos = new ArrayList<>();
        for (FieldMapping field : fields) {
            fieldDtos.add(field.toDto());
        }

        return fieldDtos;
    }

    @Override
    @Transactional
    public FieldDto findFieldByName(Long entityId, String name) {
        EntityMapping entity = getEntityDraft(entityId);

        FieldMapping field = entity.getField(name);

        if (field  == null) {
            throw new FieldNotFoundException();
        }

        return field.toDto();
    }

    private String getUsername() {
        String username = null;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            User user = (User) auth.getPrincipal();
            if (user != null) {
                username = user.getUsername();
            }
        }

        return username;
    }

    private EntityDraft getEntityDraft(Long entityId) {
        EntityMapping entity = allEntityMappings.getEntityById(entityId);

        if (entity == null) {
            throw new EntityNotFoundException();
        }

        if (entity instanceof EntityDraft) {
            return (EntityDraft) entity;
        }

        // get the user
        String username = getUsername();

        if (username == null) {
            throw new AccessDeniedException("Cannot save draft - no user");
        }

        // get the draft
        EntityDraft draft = allEntityDrafts.getDraft(entity, username);

        if (draft == null) {
            draft = allEntityDrafts.createDraft(entity, username);
        }

        return draft;
    }

    @Autowired
    public void setAllEntityMappings(AllEntityMappings allEntityMappings) {
        this.allEntityMappings = allEntityMappings;
    }

    @Autowired
    public void setConstructor(MDSConstructor constructor) {
        this.constructor = constructor;
    }

    @Autowired
    public void setAllFieldTypes(AllFieldTypes allFieldTypes) {
        this.allFieldTypes = allFieldTypes;
    }

    @Autowired
    public void setAllEntityDrafts(AllEntityDrafts allEntityDrafts) {
        this.allEntityDrafts = allEntityDrafts;
    }
}
