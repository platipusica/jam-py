import os
from setuptools import setup
import jam

setup(
    name='jam.py',
    version=jam.version(),
    url='http://jam-py.com/',
    author='Andrew Yushev',
    author_email='yushevaa@gmail.com',
    description=('Jam.py Application Builder is an event-driven framework \
        for the development of web database applications.'),
    license='BSD',
    python_requires = '>= 3.7',
    install_requires=[
        "Werkzeug>=2.2.0",
        "sqlalchemy",
        "esprima",
        "pyjsparser",
        "jsmin"
    ],
    packages=[
        'jam', 'jam.db', 'jam.admin', 'jam.secure_cookie'
    ],
    package_data={'jam': ['langs.sqlite', 'html/*.html', 'js/*.js',
        'js/modules/*.js', 'js/ace/*.js', 'img/*.*', 'css/*.*',
        'project/*.*', 'project/css/*.*', 'admin/builder_structure.info']},
    scripts=['jam/bin/jam-project.py'],
    classifiers=[
        'Development Status :: 2 - Pre-Alpha',
        'Environment :: Web Environment',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: JavaScript',
        'Topic :: Internet :: WWW/HTTP',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
        'Topic :: Software Development :: Libraries :: Application Frameworks',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Topic :: Database',
        'Topic :: Database :: Front-Ends'
    ]
)
