import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType
} from 'docx';
import type { TopicState } from './types.js';
import { getAllSteps } from './config/loader.js';

export async function generateDocx(state: TopicState): Promise<Buffer> {
  const steps = getAllSteps();

  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: 'Initiative Idea Development Summary',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  // Session ID
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Session ID: ${state.sessionId}`,
          italics: true
        })
      ],
      spacing: { after: 400 }
    })
  );

  // For each step
  steps.forEach(stepConfig => {
    const stepData = state.steps[stepConfig.stepId];

    if (!stepData || stepData.status === 'NotStarted') {
      return;
    }

    // Step heading
    sections.push(
      new Paragraph({
        text: stepConfig.displayName,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 300 }
      })
    );

    // For each topic in this step
    stepConfig.topics.forEach(topicConfig => {
      const topicData = stepData.topics[topicConfig.fieldName];

      if (!topicData || topicData.status === 'NotStarted') {
        return;
      }

      // Topic heading
      sections.push(
        new Paragraph({
          text: topicConfig.displayName,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        })
      );

      // Topic description
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: topicConfig.description,
              italics: true
            })
          ],
          spacing: { after: 200 }
        })
      );

      // Extracted value
      if (topicData.value && topicData.status === 'Complete') {
        sections.push(
          new Paragraph({
            text: 'Summary:',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          })
        );

        sections.push(
          new Paragraph({
            text: topicData.value,
            spacing: { after: 300 }
          })
        );
      }

      // Optional: Include conversation transcript for reference
      // Commented out to keep the document cleaner
      /*
      if (topicData.transcript.length > 0) {
        sections.push(
          new Paragraph({
            text: 'Conversation:',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          })
        );

        topicData.transcript.forEach(msg => {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${msg.role === 'user' ? 'User' : 'Assistant'}: `,
                  bold: true
                }),
                new TextRun({
                  text: msg.text
                })
              ],
              spacing: { after: 100 }
            })
          );
        });
      }
      */
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections
      }
    ]
  });

  return await Packer.toBuffer(doc);
}
