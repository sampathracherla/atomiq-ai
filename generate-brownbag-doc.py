"""Generate Brownbag Session Word Document for Atomiq AI."""
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

doc = Document()

# -- Styles --
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)

# ===== TITLE PAGE =====
doc.add_paragraph()
doc.add_paragraph()
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run('Atomiq AI')
run.bold = True
run.font.size = Pt(36)
run.font.color.rgb = RGBColor(0x1A, 0x56, 0xDB)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run('Enterprise Test Automation Framework')
run.font.size = Pt(18)
run.font.color.rgb = RGBColor(0x4A, 0x55, 0x68)

doc.add_paragraph()
tagline = doc.add_paragraph()
tagline.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = tagline.add_run('One Framework. All Platforms. AI-Powered.')
run.italic = True
run.font.size = Pt(14)

doc.add_paragraph()
doc.add_paragraph()
author = doc.add_paragraph()
author.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = author.add_run('Brownbag Session Guide\n')
run.font.size = Pt(12)
run = author.add_run('By Sampath Racherla')
run.font.size = Pt(14)
run.bold = True

doc.add_page_break()

# ===== WHAT IS ATOMIQ AI? =====
doc.add_heading('What is Atomiq AI?', level=1)
doc.add_paragraph(
    'Atomiq AI is a robot that tests your applications the way a human would — '
    'clicking buttons, typing text, checking if things look right — but it does it '
    'in seconds, not hours.'
)

doc.add_heading('Why Does It Exist?', level=2)
doc.add_paragraph('The Problem Today:', style='List Bullet')
doc.add_paragraph('Companies use 5+ different tools to test different things (one for websites, one for APIs, one for SAP, one for mobile)', style='List Bullet 2')
doc.add_paragraph('When developers change a button\'s name, all tests break → someone spends hours fixing them', style='List Bullet 2')
doc.add_paragraph('Writing tests is slow and manual', style='List Bullet 2')

doc.add_paragraph()
doc.add_paragraph('Atomiq AI solves all three — one tool for everything, tests that fix themselves, and AI that helps write tests.').bold = True

doc.add_page_break()

# ===== 5 KEY FEATURES =====
doc.add_heading('The 5 Key Features', level=1)

# Feature 1
doc.add_heading('1. Page Object Model (POM)', level=2)
doc.add_paragraph(
    'Analogy: Instead of writing directions to the coffee machine 50 times in 50 emails, '
    'you write it once on a sign. If the coffee machine moves, you update ONE sign.'
)
doc.add_paragraph('Each page/screen in your app gets ONE file describing its elements', style='List Bullet')
doc.add_paragraph('100 tests can share that ONE file', style='List Bullet')
doc.add_paragraph('If something changes → update 1 place, not 100 tests', style='List Bullet')

# Feature 2
doc.add_heading('2. Self-Healing Selectors', level=2)
doc.add_paragraph(
    'Analogy: You tell someone "click the blue Save button." They arrive and it\'s now green '
    'and says "Submit." A normal robot gives up. Atomiq AI thinks: "It\'s still the only button '
    'at the bottom of the form" and clicks it anyway.'
)
doc.add_paragraph('4 backup strategies to find elements even when they change', style='List Bullet')
doc.add_paragraph('Tests keep running without human intervention', style='List Bullet')
doc.add_paragraph('Less maintenance = less cost', style='List Bullet')

# Feature 3
doc.add_heading('3. Pluggable AI Providers', level=2)
doc.add_paragraph(
    'Analogy: Like having 4 different translators on speed dial (OpenAI, Azure, Google, Claude). '
    'Need a different one? Swap with one line — no rebuilding anything.'
)
doc.add_paragraph('AI can write tests from English descriptions', style='List Bullet')
doc.add_paragraph('AI can diagnose why a test failed', style='List Bullet')
doc.add_paragraph('No vendor lock-in — switch providers freely', style='List Bullet')

# Feature 4
doc.add_heading('4. Multi-Platform (Web, API, Mobile, SAP)', level=2)
doc.add_paragraph(
    'Analogy: Instead of buying a separate car for highways, city, off-road, and snow — '
    'you have ONE vehicle that handles all terrain.'
)
table = doc.add_table(rows=5, cols=2)
table.style = 'Light Grid Accent 1'
table.rows[0].cells[0].text = 'Platform'
table.rows[0].cells[1].text = 'What It Tests'
table.rows[1].cells[0].text = 'Web'
table.rows[1].cells[1].text = 'Clicking, typing, navigating websites'
table.rows[2].cells[0].text = 'API'
table.rows[2].cells[1].text = 'Backend services (no browser needed)'
table.rows[3].cells[0].text = 'Mobile'
table.rows[3].cells[1].text = 'How sites look on phones/tablets'
table.rows[4].cells[0].text = 'SAP'
table.rows[4].cells[1].text = 'Enterprise ERP systems (Fiori)'

# Feature 5
doc.add_heading('5. Visual Regression', level=2)
doc.add_paragraph(
    'Analogy: Take a photo of your website today. Tomorrow after a code change, take another photo. '
    'Atomiq AI overlays them pixel-by-pixel and highlights any differences — like a "spot the difference" '
    'game but automated.'
)

doc.add_page_break()

# ===== LIVE DEMO PLAN =====
doc.add_heading('Live Demo Plan (7 minutes)', level=1)

table = doc.add_table(rows=6, cols=3)
table.style = 'Light Grid Accent 1'
table.rows[0].cells[0].text = 'Demo'
table.rows[0].cells[1].text = 'What Audience Sees'
table.rows[0].cells[2].text = 'Time'
table.rows[1].cells[0].text = 'SauceDemo'
table.rows[1].cells[1].text = 'Login → browse → add to cart → checkout (full shopping flow in 8 sec)'
table.rows[1].cells[2].text = '2 min'
table.rows[2].cells[0].text = 'Google'
table.rows[2].cells[1].text = 'Search box, autocomplete, visual snapshot'
table.rows[2].cells[2].text = '2 min'
table.rows[3].cells[0].text = 'API'
table.rows[3].cells[1].text = 'CRUD operations, response time validation'
table.rows[3].cells[2].text = '1 min'
table.rows[4].cells[0].text = 'Mobile'
table.rows[4].cells[1].text = 'Same site on iPhone, iPad, Pixel'
table.rows[4].cells[2].text = '1 min'
table.rows[5].cells[0].text = 'HTML Report'
table.rows[5].cells[1].text = 'Beautiful dashboard with pass/fail metrics'
table.rows[5].cells[2].text = '1 min'

doc.add_paragraph()
doc.add_heading('Demo Commands', level=2)
doc.add_paragraph('npx playwright test examples/saucedemo-test.spec.ts', style='List Bullet')
doc.add_paragraph('npx playwright test examples/google-search.spec.ts', style='List Bullet')
doc.add_paragraph('npx playwright test examples/api-test.spec.ts', style='List Bullet')
doc.add_paragraph('npx playwright test examples/mobile-test.spec.ts', style='List Bullet')
doc.add_paragraph('npx playwright show-report', style='List Bullet')

doc.add_page_break()

# ===== KEY NUMBERS =====
doc.add_heading('Numbers to Remember', level=1)

table = doc.add_table(rows=6, cols=2)
table.style = 'Light Grid Accent 1'
table.rows[0].cells[0].text = 'Metric'
table.rows[0].cells[1].text = 'Value'
table.rows[1].cells[0].text = 'Total Tests'
table.rows[1].cells[1].text = '22 across 5 platforms'
table.rows[2].cells[0].text = 'Execution Time'
table.rows[2].cells[1].text = 'Under 30 seconds'
table.rows[3].cells[0].text = 'AI Providers'
table.rows[3].cells[1].text = '5 supported'
table.rows[4].cells[0].text = 'Self-Healing Strategies'
table.rows[4].cells[1].text = '4 fallback strategies'
table.rows[5].cells[0].text = 'Licensing Cost'
table.rows[5].cells[1].text = '$0 (open source)'

doc.add_page_break()

# ===== BUSINESS VALUE =====
doc.add_heading('Business Value & ROI', level=1)
doc.add_paragraph('Reduce tool licensing costs — replaces 3-5 separate tools with one open-source framework', style='List Bullet')
doc.add_paragraph('80% less maintenance — self-healing eliminates manual selector fixes', style='List Bullet')
doc.add_paragraph('5x faster test creation — AI generates tests from descriptions', style='List Bullet')
doc.add_paragraph('One skill set — TypeScript + Playwright covers all platforms', style='List Bullet')
doc.add_paragraph('Faster releases — reliable tests = confidence to ship frequently', style='List Bullet')
doc.add_paragraph('Enterprise-ready — SAP Fiori, REST APIs, responsive mobile, visual regression', style='List Bullet')

doc.add_page_break()

# ===== Q&A =====
doc.add_heading('Anticipated Questions & Answers', level=1)

qa_items = [
    ('How is this different from Selenium?', 
     'Selenium is 20 years old, no AI, no self-healing, no API testing, slower. Playwright (our foundation) is Microsoft\'s modern replacement.'),
    ('Does it work with SAP?', 
     'Yes, dedicated SAP adapter for Fiori apps.'),
    ('Is it production-ready?', 
     'It\'s a framework — teams can adopt it incrementally. Start with one app, expand.'),
    ('What skills does my team need?', 
     'TypeScript basics. One language covers all platforms.'),
    ('What about security/credentials?', 
     'Test credentials stored in environment variables, never in code.'),
    ('Can it run in CI/CD?', 
     'Yes — GitHub Actions, Azure DevOps, Jenkins — all supported natively.'),
]

table = doc.add_table(rows=len(qa_items) + 1, cols=2)
table.style = 'Light Grid Accent 1'
table.rows[0].cells[0].text = 'Question'
table.rows[0].cells[1].text = 'Answer'
for i, (q, a) in enumerate(qa_items, 1):
    table.rows[i].cells[0].text = q
    table.rows[i].cells[1].text = a

doc.add_page_break()

# ===== ELEVATOR PITCH =====
doc.add_heading('Your 30-Second Elevator Pitch', level=1)
doc.add_paragraph()
pitch = doc.add_paragraph()
pitch.paragraph_format.left_indent = Cm(1)
pitch.paragraph_format.right_indent = Cm(1)
run = pitch.add_run(
    '"Atomiq AI is a single test automation framework that replaces 5 separate tools. '
    'It tests websites, APIs, mobile, and SAP — all in TypeScript. When selectors break, '
    'it heals itself. When you need a new test, AI writes it. It runs 22 tests in under '
    '30 seconds, costs nothing to license, and my team built it."'
)
run.italic = True
run.font.size = Pt(12)

doc.add_paragraph()
doc.add_paragraph()
footer = doc.add_paragraph()
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = footer.add_run('GitHub: github.com/sampathracherla/atomiq-ai')
run.font.size = Pt(10)
run.font.color.rgb = RGBColor(0x71, 0x80, 0x96)

# Save
output_path = r'C:\Sampath\TestAutomation\Panasonic\Atomiq AI\BROWNBAG-SESSION-GUIDE.docx'
doc.save(output_path)
print(f'Word document saved: {output_path}')
