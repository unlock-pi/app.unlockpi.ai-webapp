
there are some specific changes we need to make:
1. I want you to, inside that, where you have that image that auto and everything, cleanly make and fit it properly. I wanted to use that cost particles and go and understand what components you can use from that to make it clean because this one is a 1:1 ratio and everything, like the height is fixed. I feel like you can use some icons also if icons are there for those specific things. For the standard pro this thing I think there should be better labels like "Quality Standard Pro" or something like that, "Standard" or "High Maximum Effort" or something like that.
2. With respect to these images also, this is showing 1x, 2x. There should be some label there.
3. When there is nothing inside the text input from text in book, the label that it is showing has to be changing. Use a typewriter effect. Use framer, sorry, use motion.dev.
4. For the down suggestion that we have, if you can add some icons to that, it will be really good.
5. Images should stack on top of each other. When it shows, it should basically show inside the mansary grid only, not in a separate place for this thing.
6. When it's generating this shimmer, it should show "almost done" or something like that so that the UI user is engaged.
7. The prompt should be saved with what the user prompted and the user should be able to get the prompting for the mermaid thing. Mermaid code should be only shown when motion is selected.
8. Rest, forget the mermaid thing. Don't do anything. When you click on download, it should be able to download the image of it, like a high-quality image of it.
9. If possible, make a few things very visual. For example, in the drop-down, there are just rows for a few things, like 1:1 ratio, 4:3, and so on. If you can, put a 2x2 grid way to buy two or something. I don't show the four as boxes. There should be some visual variety with respect to how many images this thing has.
10. This should all come together and make it look clean.
11. With the full shapes, this visualization made easy. Top eye, the top, this, that. Use that. You can use a more effect from other places, like magic UI and everything, so that you can see something sick, which you can take a look at and try to get things done. The cool shape should be morphing and changing to some icons that I have given, not randomly. I'll give two to three. For now, you can use something, but I'll give you specific shapes. You do it, and I'll change the shapes later.
use https://magicui.design/docs/components/typing-animation for "Visualization made easy" - component is already installed
12. I want to track the cost, or the amount spent, or something like that, for further generation, so that later we can do a cost analysis of what and everything.

see this code example, how the prompt input items are properly done, this is a decent example for you

```
 <div className="w-full px-4 pb-4">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea onChange={handleTextChange} value={text} />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <SpeechInput
                  className="shrink-0"
                  onTranscriptionChange={handleTranscriptionChange}
                  size="icon-sm"
                  variant="ghost"
                />
                <PromptInputButton
                  onClick={toggleWebSearch}
                  variant={useWebSearch ? "default" : "ghost"}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <ModelSelector
                  onOpenChange={setModelSelectorOpen}
                  open={modelSelectorOpen}
                >
                  <ModelSelectorTrigger asChild>
                    <PromptInputButton>
                      {selectedModelData?.chefSlug && (
                        <ModelSelectorLogo
                          provider={selectedModelData.chefSlug}
                        />
                      )}
                      {selectedModelData?.name && (
                        <ModelSelectorName>
                          {selectedModelData.name}
                        </ModelSelectorName>
                      )}
                    </PromptInputButton>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {chefs.map((chef) => (
                        <ModelSelectorGroup heading={chef} key={chef}>
                          {models
                            .filter((m) => m.chef === chef)
                            .map((m) => (
                              <ModelItem
                                isSelected={model === m.id}
                                key={m.id}
                                m={m}
                                onSelect={handleModelSelect}
                              />
                            ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools>
              <PromptInputSubmit disabled={isSubmitDisabled} status={status} />
            </PromptInputFooter>
          </PromptInput>
```

and also the borders are screwed , they're bad, like in dark theme them, every ui component looks alike without border or no bg color to cards, if feel like we don't prperly use the colors we have and the shades of it


---------------

Hey, you can use tooltips in some places by giving the tooltip icon. You can use cards to gather the right things. I would highly suggest you use collapsibles for some places where you want some things not to be shown, because you don't want to confuse the user suddenly the first time. There should not be too many inputs.

If you feel like some places need a drawer, for example, some questions need to be asked if the user wants to reset his dock or something like that. You can also put frames to gather the right things. You can use the fieldset in some places where you are taking input so that it is all organized. You can use the number field input for the places where you are taking numbers, and the UI of the switch is a little broken with respect to the color, so see if you can fix that thing by taking the inspiration from there.

I'll keep throwing. You can also throw some toast if needed for some places where some action is being made, save or something like that. I put all these things and stitched them together. I'm pasting you all the links https://coss.com/ui/docs/components/tooltip
https://coss.com/ui/docs/components/card
https://coss.com/ui/docs/components/collapsible

https://coss.com/ui/docs/components/drawer

https://coss.com/ui/docs/components/dialog

https://coss.com/ui/docs/components/frame

https://coss.com/ui/docs/components/fieldset

https://coss.com/ui/docs/components/number-field

https://coss.com/ui/docs/components/switch

https://coss.com/ui/docs/components/toast

and use manrope font and it's varients everywhere.



----------------------


https://export-download.canva.com/BbIYY/DAHM_uBbIYY/2/0-3953541440412264898.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260618%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260618T131137Z&X-Amz-Expires=67892&X-Amz-Signature=7341cb3a48e34f65d753f72c7ff4343c84346f8991fe1dacc489c1aae4f67d42&X-Amz-SignedHeaders=host&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%272025%2520highlights%2520blue%2520Collage%2520Style%2520Photo%2520Stack%2520Mobile%2520Video.mp4&response-expires=Fri%2C%2019%20Jun%202026%2008%3A03%3A09%20GMT






This XML file does not appear to have any style information associated with it. The document tree is shown below.
<Error>
<Code>AccessDenied</Code>
<Message>Request has expired</Message>
<X-Amz-Expires>67892</X-Amz-Expires>
<Expires>2026-06-19T08:03:09Z</Expires>
<ServerTime>2026-06-19T09:59:15Z</ServerTime>
<RequestId>GETQ1B70FWQXKAFT</RequestId>
<HostId>JugNB0l321hUuRro+SvyuTtqcWKmD1yBKwH138+9YIzVitdaSPqH5q364cGdnNiOoTdtpyLRZww=</HostId>
</Error>