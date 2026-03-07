import { Code2, Eye, Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { EditorCopy } from "../../../shared/i18n/appI18n";
import type {
  FrontMatterField,
  FrontMatterParseError
} from "../frontMatter";

export type FrontMatterPanelMode = "properties" | "yaml";

interface FrontMatterPanelProps {
  copy: EditorCopy["frontMatter"];
  fields: FrontMatterField[];
  hasFrontMatter: boolean;
  hasStructuredView: boolean;
  isEditable: boolean;
  mode: FrontMatterPanelMode;
  parseError: FrontMatterParseError | null;
  yamlValue: string;
  onAddField: () => void;
  onAddListItem: (key: string) => void;
  onBooleanChange: (key: string, value: boolean) => void;
  onEditInYaml: () => void;
  onListItemChange: (key: string, index: number, value: string) => void;
  onModeChange: (mode: FrontMatterPanelMode) => void;
  onRemoveField: (key: string) => void;
  onRemoveListItem: (key: string, index: number) => void;
  onScalarChange: (key: string, value: string) => void;
  onYamlChange: (value: string) => void;
}

interface FrontMatterIconButtonProps {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  icon: LucideIcon;
  isActive?: boolean;
  onClick: () => void;
  title: string;
}

function shouldUseTextarea(value: string): boolean {
  return value.includes("\n") || value.length > 72;
}

function FrontMatterIconButton({
  ariaLabel,
  className,
  disabled = false,
  icon: Icon,
  isActive = false,
  onClick,
  title
}: FrontMatterIconButtonProps) {
  const classes = ["frontmatter-icon-btn"];
  if (className) {
    classes.push(className);
  }
  if (isActive) {
    classes.push("is-active");
  }

  return (
    <button
      aria-label={ariaLabel}
      className={classes.join(" ")}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      <Icon className="frontmatter-icon" />
    </button>
  );
}

function renderParseNotice(
  copy: EditorCopy["frontMatter"],
  parseError: FrontMatterParseError | null,
  hasStructuredView: boolean,
  onEditInYaml: () => void
) {
  if (parseError) {
    return (
      <div
        className="frontmatter-notice is-error"
        role="status"
      >
        <span className="frontmatter-notice-title">{copy.invalidYamlTitle}</span>
        <span className="frontmatter-notice-detail">{parseError.message}</span>
        <span className="frontmatter-notice-detail">{copy.invalidYamlBody}</span>
      </div>
    );
  }

  if (hasStructuredView) {
    return null;
  }

  return (
    <div
      className="frontmatter-notice"
      role="status"
    >
      <span className="frontmatter-notice-title">{copy.mappingOnlyTitle}</span>
      <span className="frontmatter-notice-detail">{copy.mappingOnlyBody}</span>
      <FrontMatterIconButton
        ariaLabel={copy.editInYaml}
        className="frontmatter-inline-btn"
        icon={Code2}
        onClick={onEditInYaml}
        title={copy.editInYaml}
      />
    </div>
  );
}

export default function FrontMatterPanel({
  copy,
  fields,
  hasFrontMatter,
  hasStructuredView,
  isEditable,
  mode,
  parseError,
  yamlValue,
  onAddField,
  onAddListItem,
  onBooleanChange,
  onEditInYaml,
  onListItemChange,
  onModeChange,
  onRemoveField,
  onRemoveListItem,
  onScalarChange,
  onYamlChange
}: FrontMatterPanelProps) {
  if (!hasFrontMatter) {
    return null;
  }

  const canShowProperties = hasStructuredView && !parseError;

  return (
    <section
      className={`frontmatter-panel ${mode === "yaml" ? "is-yaml" : "is-properties"} ${parseError ? "is-invalid" : ""}`}
      data-frontmatter-view={mode}
    >
      <div
        aria-label={copy.title}
        className="frontmatter-mode-toolbar"
        role="toolbar"
      >
        <FrontMatterIconButton
          ariaLabel={copy.showPropertiesAria}
          className="mermaid-toolbar-btn frontmatter-mode-btn"
          disabled={!canShowProperties}
          icon={Eye}
          isActive={mode === "properties" && canShowProperties}
          onClick={() => onModeChange("properties")}
          title={copy.showPropertiesTitle}
        />
        <FrontMatterIconButton
          ariaLabel={copy.showYamlAria}
          className="mermaid-toolbar-btn frontmatter-mode-btn"
          icon={Code2}
          isActive={mode === "yaml"}
          onClick={() => onModeChange("yaml")}
          title={copy.showYamlTitle}
        />
        {mode === "properties" && hasStructuredView && isEditable ? (
          <FrontMatterIconButton
            ariaLabel={copy.addProperty}
            className="mermaid-toolbar-btn frontmatter-mode-btn"
            icon={Plus}
            onClick={onAddField}
            title={copy.addProperty}
          />
        ) : null}
      </div>

      {renderParseNotice(copy, parseError, hasStructuredView, onEditInYaml)}

      {mode === "properties" ? (
        hasStructuredView ? (
          fields.length === 0 ? (
            <div className="frontmatter-empty">{copy.empty}</div>
          ) : (
            <div className="frontmatter-fields">
              {fields.map((field) => (
                <div
                  className={`frontmatter-row frontmatter-row-${field.kind}`}
                  key={field.key}
                >
                  <code className="frontmatter-key">{field.key}</code>

                  <div className="frontmatter-value">
                    {field.kind === "boolean" ? (
                      <label
                        className="frontmatter-boolean"
                        title={copy.booleanLabel}
                      >
                        <input
                          checked={Boolean(field.value)}
                          disabled={!isEditable}
                          onChange={(event) =>
                            onBooleanChange(field.key, event.target.checked)
                          }
                          type="checkbox"
                        />
                        <span className="frontmatter-boolean-state">
                          {Boolean(field.value) ? "true" : "false"}
                        </span>
                      </label>
                    ) : null}

                    {field.kind === "scalar" ? (
                      shouldUseTextarea(String(field.value)) ? (
                        <textarea
                          className="frontmatter-input frontmatter-input-multiline"
                          disabled={!isEditable}
                          onChange={(event) =>
                            onScalarChange(field.key, event.target.value)
                          }
                          rows={Math.min(
                            5,
                            Math.max(2, String(field.value).split("\n").length)
                          )}
                          value={String(field.value)}
                        />
                      ) : (
                        <input
                          className="frontmatter-input"
                          disabled={!isEditable}
                          onChange={(event) =>
                            onScalarChange(field.key, event.target.value)
                          }
                          type="text"
                          value={String(field.value)}
                        />
                      )
                    ) : null}

                    {field.kind === "list" ? (
                      <div className="frontmatter-list-inline">
                        {(field.value as string[]).map((item, index) => (
                          <div
                            className="frontmatter-list-chip"
                            key={`${field.key}-${index}`}
                          >
                            <input
                              className="frontmatter-list-input"
                              disabled={!isEditable}
                              onChange={(event) =>
                                onListItemChange(
                                  field.key,
                                  index,
                                  event.target.value
                                )
                              }
                              type="text"
                              value={item}
                            />
                            <FrontMatterIconButton
                              ariaLabel={copy.deleteListItem}
                              className="frontmatter-inline-btn"
                              disabled={!isEditable}
                              icon={X}
                              onClick={() => onRemoveListItem(field.key, index)}
                              title={copy.deleteListItem}
                            />
                          </div>
                        ))}
                        {isEditable ? (
                          <FrontMatterIconButton
                            ariaLabel={copy.addListItem}
                            className="frontmatter-inline-btn frontmatter-list-add-btn"
                            icon={Plus}
                            onClick={() => onAddListItem(field.key)}
                            title={copy.addListItem}
                          />
                        ) : null}
                      </div>
                    ) : null}

                    {field.kind === "complex" ? (
                      <div
                        className="frontmatter-complex"
                        title={field.preview ?? undefined}
                      >
                        <span className="frontmatter-complex-label">
                          {copy.complexValue}
                        </span>
                        <code className="frontmatter-complex-preview">
                          {field.preview ?? ""}
                        </code>
                      </div>
                    ) : null}
                  </div>

                  <div className="frontmatter-actions">
                    {field.kind === "complex" ? (
                      <FrontMatterIconButton
                        ariaLabel={copy.editInYaml}
                        className="frontmatter-inline-btn"
                        icon={Code2}
                        onClick={onEditInYaml}
                        title={copy.editInYaml}
                      />
                    ) : null}
                    <FrontMatterIconButton
                      ariaLabel={copy.deleteProperty}
                      className="frontmatter-inline-btn"
                      disabled={!isEditable}
                      icon={X}
                      onClick={() => onRemoveField(field.key)}
                      title={copy.deleteProperty}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null
      ) : (
        <textarea
          className="frontmatter-yaml"
          disabled={!isEditable}
          onChange={(event) => onYamlChange(event.target.value)}
          placeholder={copy.yamlPlaceholder}
          spellCheck={false}
          value={yamlValue}
        />
      )}
    </section>
  );
}
