                      </p>
                    </div>
                    {previewEmbed.thumbnail?.url && (
                      <img
                        src={previewEmbed.thumbnail.url}
                        alt="Thumbnail"
                        className="size-20 rounded object-cover"
                      />
                    )}
                  </div>

                  {previewEmbed.image?.url && (
                    <img
                      src={previewEmbed.image.url}
                      alt="Banner"
                      className="mt-4 max-h-64 w-full rounded object-contain"
                    />
                  )}

                  {previewEmbed.footerText && (
                    <p className="mt-3 text-xs text-[#949ba4]">
                      {previewEmbed.footerText}
                    </p>
                  )}
                </div>
              )}

              {previewButtons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewButtons.map(b => (
                    <div
                      key={b.id}
                      className="rounded px-3 py-2 text-xs font-medium text-white"
                      style={{
                        backgroundColor:
                          b.style === 'success' ? '#248046' :
                          b.style === 'danger' ? '#da373c' :
                          b.style === 'primary' ? '#5865f2' :
                          '#4e5058'
                      }}
                    >
                      {b.emoji} {b.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-5 font-semibold">
          Saved Ticket Panels ({items.length})
        </h2>

        {panels.error && (
          <p className="text-sm text-destructive">
            Unable to load ticket panels.
          </p>
        )}

        {!panels.data && !panels.error && (
          <p className="text-sm text-muted-foreground">
            Loading panels...
          </p>
        )}

        <div className="flex flex-col gap-3">
          {items.map(panel => (
            <div
              key={panel.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{panel.name}</p>
                <p className="text-xs text-muted-foreground">
                  {panel.state} · {panel.message.buttons.length} buttons
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => publishPanel(panel.id)}
                  disabled={saving}
                  className="rounded border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  Publish
                </button>
                <button
                  onClick={() => editPanel(panel)}
                  className="rounded border border-border p-2 hover:border-primary"
                  aria-label={`Edit ${panel.name}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => deletePanel(panel.id)}
                  disabled={saving}
                  className="rounded border border-border p-2 text-destructive"
                  aria-label={`Delete ${panel.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
